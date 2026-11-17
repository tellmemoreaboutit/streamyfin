import type {
  BaseItemDto,
  MediaSourceInfo,
} from "@jellyfin/sdk/lib/generated-client";
import { requireOptionalNativeModule } from "expo";
import { useGlobalSearchParams } from "expo-router";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { prefetchServerImage } from "@/components/common/ServerImage";
import { useSlowmoJobs } from "@/hooks/useSlowmoJobs";
import { useDownload } from "@/providers/DownloadProvider";
import { apiAtom } from "@/providers/JellyfinProvider";
import {
  bucketSeconds,
  FrameCache,
  resolveFrameSource,
} from "@/utils/scrubFrame";
import { isSlowmoSource } from "@/utils/slowmo";
import { ticksToMs } from "@/utils/time";
import {
  generateTrickplayUrl,
  getTrickplayInfo,
  type TrickplayInfo,
} from "@/utils/trickplay";

interface TrickplayUrl {
  x: number;
  y: number;
  url: string;
}

const FRAME_THROTTLE_MS = 150;
// Output width in pixels: the bubble is ~240pt wide at 2-3x density.
const FRAME_MAX_WIDTH = 480;

type FrameModule = {
  thumbnailAt?: (
    url: string,
    seconds: number,
    maxWidth: number,
  ) => Promise<string | null>;
};

/**
 * Hook to handle trickplay logic for a given item. Without Jellyfin trickplay
 * it falls back to grabbing a frame on-device (iOS, mp4/mov sources only), see
 * `scrubFrame`.
 * @param mediaSourceId The playing version, see getTrickplayInfo.
 * @param mediaSource The playing source, for the on-device frame fallback.
 */
export const useTrickplay = (
  item: BaseItemDto,
  mediaSourceId?: string | null,
  mediaSource?: MediaSourceInfo | null,
) => {
  const api = useAtomValue(apiAtom);
  const { getDownloadedItemById } = useDownload();
  const [trickPlayUrl, setTrickPlayUrl] = useState<TrickplayUrl | null>(null);
  const lastCalculationTime = useRef(0);
  const throttleDelay = 200;
  const isOffline = useGlobalSearchParams().offline === "true";
  const trickplayInfo = useMemo(
    () => getTrickplayInfo(item, mediaSourceId),
    [item, mediaSourceId],
  );

  // On-device frame fallback
  const slowmo = !!mediaSource && isSlowmoSource(mediaSource);
  const { data: jobs } = useSlowmoJobs(slowmo);
  const [frameUri, setFrameUri] = useState<string | null>(null);
  const frameCache = useRef(new FrameCache(60));
  const frameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameRequest = useRef(0);
  const latestSeconds = useRef(0);
  const native = useMemo(
    () =>
      Platform.OS === "ios" && !Platform.isTV
        ? requireOptionalNativeModule<FrameModule>("MpvPlayer")
        : null,
    [],
  );
  const frameEnabled =
    !trickplayInfo &&
    typeof native?.thumbnailAt === "function" &&
    !!api?.accessToken &&
    !!resolveFrameSource(item, mediaSource, jobs, 0);
  const videoStream = mediaSource?.MediaStreams?.find(
    (s) => s.Type === "Video",
  );
  const frameAspectRatio =
    videoStream?.Width && videoStream?.Height
      ? videoStream.Width / videoStream.Height
      : 16 / 9;

  useEffect(
    () => () => {
      if (frameTimer.current) clearTimeout(frameTimer.current);
    },
    [],
  );

  const requestFrame = useCallback(async () => {
    const target = resolveFrameSource(
      item,
      mediaSource,
      jobs,
      bucketSeconds(latestSeconds.current),
    );
    if (!target || !api) return;
    const bucket = bucketSeconds(target.seconds);
    const key = `${target.sourceId}:${bucket}`;
    const cached = frameCache.current.get(key);
    if (cached) return setFrameUri(cached);
    const id = ++frameRequest.current;
    const url = `${api.basePath}/Videos/${item.Id}/stream.${target.ext}?static=true&mediaSourceId=${target.sourceId}&ApiKey=${api.accessToken}`;
    try {
      const uri = await native?.thumbnailAt?.(url, bucket, FRAME_MAX_WIDTH);
      if (!uri) return;
      frameCache.current.set(key, uri);
      // Only the newest request matters while scrubbing.
      if (id === frameRequest.current) setFrameUri(uri);
    } catch {}
  }, [item, mediaSource, jobs, api, native]);

  /** Throttled with a trailing call, so the last scrub position always lands. */
  const scheduleFrame = useCallback(
    (progressTicks: number) => {
      latestSeconds.current = Math.max(0, ticksToMs(progressTicks)) / 1000;
      if (frameTimer.current) return;
      frameTimer.current = setTimeout(() => {
        frameTimer.current = null;
        requestFrame();
      }, FRAME_THROTTLE_MS);
    },
    [requestFrame],
  );

  /** Generates the trickplay URL for the given item and sheet index.
   * We change between offline and online trickplay URLs depending on the state of the app. */
  const getTrickplayUrl = useCallback(
    (item: BaseItemDto, sheetIndex: number) => {
      // If we are offline, we can use the downloaded item's trickplay data path
      const downloadedItem = getDownloadedItemById(item.Id!);
      if (isOffline && downloadedItem?.trickPlayData?.path) {
        return `${downloadedItem.trickPlayData.path}${sheetIndex}.jpg`;
      }
      return generateTrickplayUrl(item, sheetIndex, api, mediaSourceId);
    },
    [trickplayInfo, isOffline, getDownloadedItemById, api, mediaSourceId],
  );

  /** Calculates the trickplay URL for the current progress. */
  const calculateTrickplayUrl = useCallback(
    (progress: number) => {
      if (frameEnabled) return scheduleFrame(progress);
      const now = Date.now();
      if (
        !trickplayInfo ||
        !item.Id ||
        now - lastCalculationTime.current < throttleDelay
      )
        return;
      lastCalculationTime.current = now;
      const { sheetIndex, x, y } = calculateTrickplayTile(
        progress,
        trickplayInfo,
      );
      const url = getTrickplayUrl(item, sheetIndex);
      if (url) setTrickPlayUrl({ x, y, url });
    },
    [
      trickplayInfo,
      item,
      throttleDelay,
      getTrickplayUrl,
      frameEnabled,
      scheduleFrame,
    ],
  );

  /** Prefetches all the trickplay images for the item, limiting concurrency to avoid I/O spikes. */
  const prefetchAllTrickplayImages = useCallback(async () => {
    if (!trickplayInfo || !item.Id) return;
    const maxConcurrent = 4;
    const total = trickplayInfo.totalImageSheets;
    const urls: string[] = [];
    for (let index = 0; index < total; index++) {
      const url = getTrickplayUrl(item, index);
      if (url) urls.push(url);
    }
    for (let i = 0; i < urls.length; i += maxConcurrent) {
      const batch = urls.slice(i, i + maxConcurrent);
      await Promise.all(
        batch.map(
          (url) => prefetchServerImage(url, api?.basePath).catch(() => {}), // Ignore errors
        ),
      );
      // Yield to the event loop between batches to avoid blocking
      await Promise.resolve();
    }
  }, [trickplayInfo, item, getTrickplayUrl, api?.basePath]);

  return {
    trickPlayUrl,
    calculateTrickplayUrl,
    prefetchAllTrickplayImages,
    trickplayInfo,
    /** On-device frame for the scrub bubble; null when the fallback doesn't apply. */
    scrubFrame: frameEnabled
      ? { uri: frameUri, aspectRatio: frameAspectRatio }
      : null,
  };
};

export interface TrickplayData {
  Interval?: number;
  TileWidth?: number;
  TileHeight?: number;
  Height?: number;
  Width?: number;
  ThumbnailCount?: number;
}

/**
 * Calculates the specific image sheet and tile offset for a given time.
 * @param progressTicks The current playback time in ticks.
 * @param trickplayInfo The parsed trickplay information object.
 * @returns An object with the image sheet index, and the X/Y coordinates for the tile.
 */
const calculateTrickplayTile = (
  progressTicks: number,
  trickplayInfo: TrickplayInfo,
) => {
  const { data } = trickplayInfo;
  const { Interval, TileWidth, TileHeight } = data;

  if (!Interval || !TileWidth || !TileHeight) {
    throw new Error("Invalid trickplay data provided to calculateTile");
  }

  const currentTimeMs = Math.max(0, ticksToMs(progressTicks));
  const currentTile = Math.floor(currentTimeMs / Interval);

  const tilesPerSheet = TileWidth * TileHeight;
  const sheetIndex = Math.floor(currentTile / tilesPerSheet);
  const tileIndexInSheet = currentTile % tilesPerSheet;

  const x = tileIndexInSheet % TileWidth;
  const y = Math.floor(tileIndexInSheet / TileWidth);

  return { sheetIndex, x, y };
};

import type { MediaSourceInfo } from "@jellyfin/sdk/lib/generated-client/models";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { toast } from "sonner-native";
import type { OptionGroup } from "@/components/PlatformDropdown";
import useRouter from "@/hooks/useAppRouter";
import { useItemQuery } from "@/hooks/useItemQuery";
import { useOfflineMode } from "@/providers/OfflineModeProvider";
import { useSettings } from "@/utils/atoms/settings";
import {
  deleteSlowmoVersion,
  getSlowmoJobs,
  isSlowmoSource,
  mapPositionBetweenVersions,
  slowmoLabel,
} from "@/utils/slowmo";
import { usePlayerContext } from "../contexts/PlayerContext";

/**
 * The versions (MediaSources) of the playing movie: switching one reopens the
 * player on it at the mapped position, and slowmo versions can be deleted.
 * Shared by the "⋯" menu and the header versions button.
 */
export function useVersionSwitch(positionMs?: SharedValue<number>) {
  const { item, mediaSource } = usePlayerContext();
  const { settings } = useSettings();
  const router = useRouter();
  const isOffline = useOfflineMode();
  const { t } = useTranslation();
  const { audioIndex, subtitleIndex, bitrateValue, playbackPosition } =
    useLocalSearchParams<{
      audioIndex: string;
      subtitleIndex: string;
      bitrateValue: string;
      playbackPosition: string;
    }>();
  const playbackPositionRef = useRef(playbackPosition);
  playbackPositionRef.current = playbackPosition;
  const itemIdRef = useRef(item.Id);
  const mediaSourceIdRef = useRef(mediaSource?.Id);
  itemIdRef.current = item.Id;
  mediaSourceIdRef.current = mediaSource?.Id;

  // Fresh MediaSources (with Path) of the movie
  const { data: fresh, refetch } = useItemQuery(
    item.Id,
    isOffline,
    undefined,
    [],
    { staleTime: 0 },
  );
  const sources = fresh?.MediaSources ?? item.MediaSources ?? [];

  const switchSource = useCallback(
    async (source: MediaSourceInfo) => {
      if (source.Id === mediaSourceIdRef.current) return;
      // Slowmo versions have another timeline: map the position through the
      // job that made them; without the server the position is kept.
      let seconds = positionMs ? positionMs.value / 1000 : null;
      if (seconds !== null) {
        try {
          const jobs = await getSlowmoJobs(settings);
          seconds = mapPositionBetweenVersions(
            seconds,
            {
              path: mediaSource?.Path,
              slowmo: !!mediaSource && isSlowmoSource(mediaSource),
            },
            { path: source.Path, slowmo: isSlowmoSource(source) },
            jobs,
          );
        } catch {}
      }
      const queryParams = new URLSearchParams({
        itemId: itemIdRef.current ?? "",
        audioIndex: audioIndex?.toString() ?? "",
        subtitleIndex: subtitleIndex?.toString() ?? "",
        mediaSourceId: source.Id ?? "",
        bitrateValue: bitrateValue?.toString() ?? "",
        playbackPosition:
          seconds !== null
            ? Math.round(seconds * 10000000).toString()
            : playbackPositionRef.current,
      }).toString();
      router.replace(`player/direct-player?${queryParams}` as any);
    },
    [
      audioIndex,
      subtitleIndex,
      bitrateValue,
      positionMs,
      router,
      settings,
      mediaSource,
    ],
  );

  // Only ever called with slowmo sources
  const confirmDelete = useCallback(
    (source: MediaSourceInfo) => {
      if (!source.Path || !isSlowmoSource(source)) return;
      const path = source.Path;
      Alert.alert(t("slowmo.delete_confirm"), slowmoLabel(source), [
        { text: t("slowmo.cancel"), style: "cancel" },
        {
          text: t("slowmo.delete"),
          style: "destructive",
          onPress: () =>
            deleteSlowmoVersion(settings, path)
              .then(() => refetch())
              .catch((e) => toast.error(`${t("slowmo.failed")}: ${e.message}`)),
        },
      ]);
    },
    [settings, t, refetch],
  );

  const slowmoSources = useMemo(
    () => sources.filter(isSlowmoSource),
    [sources],
  );

  // The version picker: every version (current marked), then delete rows
  const versionsGroup = useMemo<OptionGroup>(
    () => ({
      title: t("slowmo.versions"),
      options: [
        ...sources.map((source) => ({
          type: "radio" as const,
          label: isSlowmoSource(source)
            ? slowmoLabel(source)
            : t("slowmo.original"),
          value: source.Id ?? "",
          selected: source.Id === mediaSource?.Id,
          onPress: () => switchSource(source),
        })),
        ...slowmoSources.map((source) => ({
          type: "action" as const,
          label: `${t("slowmo.delete")} ${slowmoLabel(source)}`,
          onPress: () => confirmDelete(source),
        })),
      ],
    }),
    [sources, slowmoSources, mediaSource?.Id, switchSource, confirmDelete, t],
  );

  return { sources, slowmoSources, versionsGroup };
}

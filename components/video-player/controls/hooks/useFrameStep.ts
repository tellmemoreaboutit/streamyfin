import { useCallback, useMemo, useRef } from "react";
import type { SharedValue } from "react-native-reanimated";
import { getStreamFrameRate } from "@/utils/jellyfin/media/getStreamFrameRate";
import { usePlayerContext } from "../contexts/PlayerContext";
import { frameStepTarget } from "../utils/scrub";

const DEFAULT_FPS = 24;
// A step taken before the player reported the previous one builds on it
const CHAIN_WINDOW_MS = 600;

/** Steps the paused picture one frame at a time (seek by 1/fps; mpv exposes no frame-step). */
export function useFrameStep(
  progress: SharedValue<number>,
  seek: (ms: number) => void,
  durationMs: number,
) {
  const { mediaSource } = usePlayerContext();
  const fps = useMemo(
    () =>
      getStreamFrameRate(
        mediaSource?.MediaStreams?.find((s) => s.Type === "Video"),
      ) ?? DEFAULT_FPS,
    [mediaSource],
  );
  const last = useRef({ at: 0, target: 0 });

  return useCallback(
    (direction: 1 | -1) => {
      const now = Date.now();
      const base =
        now - last.current.at < CHAIN_WINDOW_MS
          ? last.current.target
          : progress.value;
      const target = frameStepTarget(base, fps, direction, durationMs);
      last.current = { at: now, target };
      seek(target);
    },
    [fps, progress, seek, durationMs],
  );
}

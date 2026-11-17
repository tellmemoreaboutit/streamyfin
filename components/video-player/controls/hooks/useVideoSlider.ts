import debounce from "lodash/debounce";
import { useCallback, useRef, useState } from "react";
import type { SharedValue } from "react-native-reanimated";
import { msToTicks, ticksToSeconds } from "@/utils/time";
import { CONTROLS_CONSTANTS } from "../constants";

/**
 * Target of a drag anywhere on the video (native player parity): the full
 * screen width maps to the full duration, starting from where the drag began.
 */
export const surfaceScrubTarget = (
  startMs: number,
  fraction: number,
  durationMs: number,
) => Math.min(Math.max(startMs + fraction * durationMs, 0), durationMs);

interface UseVideoSliderProps {
  progress: SharedValue<number>;
  isSeeking: SharedValue<boolean>;
  isPlaying: boolean;
  seek: (value: number) => void;
  play: () => void;
  pause: () => void;
  calculateTrickplayUrl: (progressInTicks: number) => void;
  showControls: boolean;
}

/**
 * Hook to manage video slider interactions.
 * MPV player uses milliseconds for time values.
 */
export function useVideoSlider({
  progress,
  isSeeking,
  isPlaying,
  seek,
  play,
  pause,
  calculateTrickplayUrl,
  showControls,
}: UseVideoSliderProps) {
  const [isSliding, setIsSliding] = useState(false);
  const [time, setTime] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const wasPlayingRef = useRef(false);
  const lastProgressRef = useRef<number>(0);
  const surfaceScrub = useRef({ startMs: 0, valueMs: 0 });

  const handleSliderStart = useCallback(() => {
    if (!showControls) {
      return;
    }

    setIsSliding(true);
    wasPlayingRef.current = isPlaying;
    lastProgressRef.current = progress.value;

    pause();
    isSeeking.value = true;
  }, [showControls, isPlaying, pause, progress, isSeeking]);

  const handleTouchStart = useCallback(() => {
    if (!showControls) {
      return;
    }
  }, [showControls]);

  const handleTouchEnd = useCallback(() => {
    if (!showControls) {
      return;
    }
  }, [showControls]);

  const handleSliderComplete = useCallback(
    async (value: number) => {
      setIsSliding(false);
      isSeeking.value = false;
      progress.value = value;
      // MPV uses ms, seek expects ms
      const seekValue = Math.max(0, Math.floor(value));
      seek(seekValue);
      if (wasPlayingRef.current) {
        play();
      }
    },
    [seek, play, progress, isSeeking],
  );

  // Programmatic seek (chapter list, hotkeys) that bypasses the slide gesture.
  // Reads `isPlaying` directly instead of `wasPlayingRef`, which is only set
  // during a real slide and would carry stale state on a tap-to-seek.
  const seekTo = useCallback(
    (value: number) => {
      const seekValue = Math.max(0, Math.floor(value));
      progress.value = seekValue;
      seek(seekValue);
      if (isPlaying) {
        play();
      }
    },
    [seek, play, progress, isPlaying],
  );

  const handleSliderChange = useCallback(
    debounce((value: number) => {
      // Convert ms to ticks for trickplay
      const progressInTicks = msToTicks(value);
      calculateTrickplayUrl(progressInTicks);
      const progressInSeconds = Math.floor(ticksToSeconds(progressInTicks));
      const hours = Math.floor(progressInSeconds / 3600);
      const minutes = Math.floor((progressInSeconds % 3600) / 60);
      const seconds = progressInSeconds % 60;
      setTime({ hours, minutes, seconds });
    }, CONTROLS_CONSTANTS.SLIDER_DEBOUNCE_MS),
    [calculateTrickplayUrl],
  );

  // Scrub by dragging on the video: same pause / trickplay / seek-on-release
  // path as the slider, driven by the gesture overlay instead of the thumb.
  const beginSurfaceScrub = useCallback(() => {
    setIsSliding(true);
    wasPlayingRef.current = isPlaying;
    surfaceScrub.current = {
      startMs: progress.value,
      valueMs: progress.value,
    };
    pause();
    isSeeking.value = true;
  }, [isPlaying, pause, progress, isSeeking]);

  const moveSurfaceScrub = useCallback(
    (fraction: number, durationMs: number) => {
      const value = surfaceScrubTarget(
        surfaceScrub.current.startMs,
        fraction,
        durationMs,
      );
      surfaceScrub.current.valueMs = value;
      handleSliderChange(value);
      return value;
    },
    [handleSliderChange],
  );

  const endSurfaceScrub = useCallback(
    (cancelled: boolean) => {
      if (!cancelled) {
        handleSliderComplete(surfaceScrub.current.valueMs);
        return;
      }
      // Back to where it was: no seek
      setIsSliding(false);
      isSeeking.value = false;
      if (wasPlayingRef.current) play();
    },
    [handleSliderComplete, isSeeking, play],
  );

  return {
    isSliding,
    time,
    handleSliderStart,
    handleTouchStart,
    handleTouchEnd,
    handleSliderComplete,
    handleSliderChange,
    seekTo,
    beginSurfaceScrub,
    moveSurfaceScrub,
    endSurfaceScrub,
  };
}

import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import type { SharedValue } from "react-native-reanimated";
import {
  slowmoLoopAtom,
  slowmoSegmentsAtom,
  slowmoSelectedAtom,
} from "@/utils/atoms/slowmoSelection";
import { usePlayerContext } from "../contexts/PlayerContext";
import { loopSeekTarget } from "../utils/scrub";

const POLL_MS = 100;
// Right after a seek the position still reads old for a moment
const COOLDOWN_MS = 700;

/**
 * Plays the segment open in the Slowmo editor in a loop, at the chosen speed.
 * The speed is set on the player directly: a preview must not be saved as the
 * movie's playback speed.
 */
export function useSegmentLoop({
  progress,
  seek,
  play,
  playbackSpeed,
}: {
  progress: SharedValue<number>;
  seek: (ms: number) => void;
  play: () => void;
  playbackSpeed: number;
}) {
  const { playerRef } = usePlayerContext();
  const loop = useAtomValue(slowmoLoopAtom);
  const segments = useAtomValue(slowmoSegmentsAtom);
  const selected = useAtomValue(slowmoSelectedAtom);
  const seg = selected !== null ? segments[selected] : undefined;
  const active = loop.on && !!seg;

  const segRef = useRef(seg);
  segRef.current = seg;
  const speedRef = useRef(playbackSpeed);
  speedRef.current = playbackSpeed;
  const lastSeekRef = useRef(0);
  const seekRef = useRef(seek);
  seekRef.current = seek;
  const playRef = useRef(play);
  playRef.current = play;

  // Preview speed, put back when the loop ends
  useEffect(() => {
    if (!active) return;
    playerRef.current?.setSpeed?.(loop.rate);
    return () => {
      playerRef.current?.setSpeed?.(speedRef.current);
    };
  }, [active, loop.rate, playerRef]);

  // Start (again) when switched on, another segment opens or its start moves
  const start = seg?.start;
  useEffect(() => {
    if (!active || start === undefined) return;
    lastSeekRef.current = Date.now();
    seekRef.current(start * 1000);
    playRef.current();
  }, [active, selected, start]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      const current = segRef.current;
      if (!current || Date.now() - lastSeekRef.current < COOLDOWN_MS) return;
      const target = loopSeekTarget(progress.value, current);
      if (target === null) return;
      lastSeekRef.current = Date.now();
      seekRef.current(target);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [active, progress]);
}

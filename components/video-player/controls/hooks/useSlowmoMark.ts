import { useAtom, useSetAtom } from "jotai";
import type { SharedValue } from "react-native-reanimated";
import { useHaptic } from "@/hooks/useHaptic";
import {
  slowmoPendingStartAtom,
  slowmoSegmentsAtom,
  slowmoSelectedAtom,
} from "@/utils/atoms/slowmoSelection";

/** Marks segment start and end alternately at the playhead (light haptic, no toast). */
export function useSlowmoMark(progress: SharedValue<number>) {
  const haptic = useHaptic("light");
  const [segments, setSegments] = useAtom(slowmoSegmentsAtom);
  const [pendingStart, setPendingStart] = useAtom(slowmoPendingStartAtom);
  const setSelected = useSetAtom(slowmoSelectedAtom);

  const mark = () => {
    haptic();
    const now = progress.value / 1000;
    if (pendingStart === null) {
      setPendingStart(now);
      return;
    }
    setSegments((prev) => [
      ...prev,
      { start: Math.min(pendingStart, now), end: Math.max(pendingStart, now) },
    ]);
    setSelected(segments.length);
    setPendingStart(null);
  };

  return { mark, pending: pendingStart !== null };
}

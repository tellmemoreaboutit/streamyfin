import { atom } from "jotai";
import type { SlowmoSegment } from "@/utils/slowmo";

// The segments being marked in the player, shared by the header control and
// the timeline above the seek bar.
export const slowmoSegmentsAtom = atom<SlowmoSegment[]>([]);
// Slowmo mode: shows the marking toolbar next to the seek bar
export const slowmoModeAtom = atom(false);
// Start (s) of the segment being marked; null between segments
export const slowmoPendingStartAtom = atom<number | null>(null);
// Index of the segment open in the timeline editor
export const slowmoSelectedAtom = atom<number | null>(null);
// Loop the segment open in the editor, optionally slowed down to preview it
export const slowmoLoopAtom = atom<{ on: boolean; rate: number }>({
  on: false,
  rate: 1,
});
// Movie the player has open: its own Slowmo UI announces finished jobs, so the
// global notifier stays quiet for it.
export const slowmoPlayerItemAtom = atom<string | null>(null);

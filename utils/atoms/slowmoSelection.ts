import { atom } from "jotai";
import type { SlowmoSegment } from "@/utils/slowmo";

// The segments being marked in the player, shared by the header control and
// the timeline above the seek bar.
export const slowmoSegmentsAtom = atom<SlowmoSegment[]>([]);
// Start (s) of the segment being marked; null between segments
export const slowmoPendingStartAtom = atom<number | null>(null);
// Index of the segment open in the timeline editor
export const slowmoSelectedAtom = atom<number | null>(null);

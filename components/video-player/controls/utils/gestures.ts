// Pure helpers for the classic player's touch gestures (exit swipe, double
// tap seeking), kept apart from the components so they can be tested.

/** Choices for the height of the exit-swipe zone, in % of the screen height. */
export const EXIT_ZONE_OPTIONS = [10, 15, 20, 25, 33] as const;

/** Height in px of the exit zone at the top of the screen. */
export const exitZoneHeight = (height: number, zonePercent: number) =>
  Math.max(0, (height * zonePercent) / 100);

/** Whether a touch at `y` (px from the top) starts inside the exit zone. */
export const inExitZone = (y: number, height: number, zonePercent: number) =>
  y < exitZoneHeight(height, zonePercent);

const EXIT_MIN_DISTANCE = 80;
const EXIT_MAX_DURATION_MS = 700;

/** A long enough, quick enough, mostly horizontal swipe (either direction). */
export const isExitSwipe = (dx: number, dy: number, durationMs: number) =>
  Math.abs(dx) >= EXIT_MIN_DISTANCE &&
  Math.abs(dx) > Math.abs(dy) * 1.5 &&
  durationMs <= EXIT_MAX_DURATION_MS;

/** Left half of the screen seeks back, right half forward (like the native player). */
export const doubleTapSide = (x: number, width: number) =>
  x >= width / 2 ? "forward" : "back";

/** Signed seconds for a double tap at `x`, from the user's skip settings. */
export const doubleTapSeconds = (
  x: number,
  width: number,
  rewindSeconds: number,
  forwardSeconds: number,
) =>
  doubleTapSide(x, width) === "forward"
    ? Math.max(0, forwardSeconds || 0)
    : -Math.max(0, rewindSeconds || 0);

export const SEEK_CHAIN_MS = 700;

export type SeekChain = { side: "forward" | "back"; total: number; at: number };

/**
 * Taps that follow a double tap within SEEK_CHAIN_MS on the same side keep
 * adding to the seek (YouTube style). Returns the new chain; `total` is the
 * signed sum shown in the feedback.
 */
export const extendSeekChain = (
  prev: SeekChain | null,
  side: "forward" | "back",
  signedSeconds: number,
  now: number,
): SeekChain =>
  prev && prev.side === side && now - prev.at <= SEEK_CHAIN_MS
    ? { side, total: prev.total + signedSeconds, at: now }
    : { side, total: signedSeconds, at: now };

/** Whether a single tap at `now` continues the chain rather than toggling controls. */
export const continuesSeekChain = (prev: SeekChain | null, now: number) =>
  !!prev && now - prev.at <= SEEK_CHAIN_MS;

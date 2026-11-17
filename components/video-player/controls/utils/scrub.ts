// Pure math for the classic player's scrubbing, frame stepping and segment
// loop, kept apart from the hooks so it can be tested without a player.

/** Seconds a full-width drag covers; 0 means the whole movie. */
export const SCRUB_SPAN_OPTIONS = [60, 120, 300, 600, 1800, 0] as const;

/** A full-width drag covers this many ms, never more than the movie. */
export const scrubSpanMs = (spanSeconds: number, durationMs: number) =>
  spanSeconds > 0 ? Math.min(spanSeconds * 1000, durationMs) : durationMs;

// Like iOS: the further the finger is from where the drag began vertically,
// the finer the scrub. Distances in px.
const FINE_STEPS = [
  { from: 80, rate: 0.5 },
  { from: 160, rate: 0.25 },
  { from: 240, rate: 0.1 },
] as const;

/** Scrub speed multiplier for a vertical offset from the drag start. */
export const scrubRate = (offsetY: number, enabled = true) => {
  if (!enabled) return 1;
  const d = Math.abs(offsetY);
  let rate = 1;
  for (const step of FINE_STEPS) if (d >= step.from) rate = step.rate;
  return rate;
};

/**
 * Moves the scrub target by a share of the screen width. Incremental (not
 * start + total), so changing the rate mid-drag never makes the target jump.
 */
export const scrubStep = (
  valueMs: number,
  deltaFraction: number,
  spanMs: number,
  rate: number,
  durationMs: number,
) => Math.min(Math.max(valueMs + deltaFraction * spanMs * rate, 0), durationMs);

/** Whether moving from a to b passes one of the marks (ms). */
export const crossedMark = (a: number, b: number, marks: number[]) =>
  marks.some((m) => (a < m && b >= m) || (a > m && b <= m));

/**
 * Seek target (ms) one frame away. Lands in the middle of the frame so a
 * seek that rounds down still shows that frame and not its predecessor.
 */
export const frameStepTarget = (
  posMs: number,
  fps: number,
  direction: 1 | -1,
  durationMs: number,
) => {
  const frame = 1000 / fps;
  const index = Math.floor(posMs / frame + 1e-3);
  const target = (index + direction + 0.5) * frame;
  return Math.min(Math.max(target, 0), Math.max(durationMs - frame, 0));
};

/** Where a looped segment (seconds) sends playback, or null to keep going. */
export const loopSeekTarget = (
  posMs: number,
  seg: { start: number; end: number },
) =>
  posMs >= seg.end * 1000 || posMs < seg.start * 1000 - 1000
    ? seg.start * 1000
    : null;

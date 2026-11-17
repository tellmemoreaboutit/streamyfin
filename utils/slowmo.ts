import type { MediaSourceInfo } from "@jellyfin/sdk/lib/generated-client/models";
import type { Settings } from "@/utils/atoms/settings";

type SlowmoSettings = Pick<Settings, "slowmoServerUrl" | "slowmoToken">;

export type SlowmoSegment = { start: number; end: number };

export const SLOWMO_FACTORS = [2, 3, 4, 5, 6] as const;

export type SlowmoJob = {
  id: string;
  itemId: string;
  name: string;
  segments: SlowmoSegment[];
  factor: number;
  status: "queued" | "running" | "done" | "error" | "cancelled";
  progress: number;
  error: string | null;
  createdAt: string;
  output?: string | null;
  steps?: number | null;
  /** Seconds left, null while unknown. */
  eta?: number | null;
  startedAt?: string | null;
  elapsed?: number | null;
  queuePos?: number | null;
  startsIn?: number | null;
};

// Calls the Slowmo service; the optional token goes in X-Slower-Token.
const slowmoFetch = async (
  settings: SlowmoSettings,
  path: string,
  init: RequestInit = {},
) => {
  const base = (settings.slowmoServerUrl ?? "").replace(/\/+$/, "");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(settings.slowmoToken
        ? { "X-Slower-Token": settings.slowmoToken }
        : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

/** Segments are in seconds; an empty list slows the whole movie. */
export const createSlowmoJob = (
  settings: SlowmoSettings,
  job: { itemId: string; segments: SlowmoSegment[]; factor: number },
): Promise<{ id: string }> =>
  slowmoFetch(settings, "/jobs", { method: "POST", body: JSON.stringify(job) });

export const getSlowmoJobs = (settings: SlowmoSettings): Promise<SlowmoJob[]> =>
  slowmoFetch(settings, "/jobs");

/** `path` is the MediaSource.Path of the slowmo version. */
export const deleteSlowmoVersion = (
  settings: SlowmoSettings,
  path: string,
): Promise<{ ok: boolean }> =>
  slowmoFetch(settings, "/versions", {
    method: "DELETE",
    body: JSON.stringify({ path }),
  });

// Versions written by the service are named "<movie> - Slowmo x4 01m30s +2.mp4" (older versions: .mkv).
export const isSlowmoSource = (source: MediaSourceInfo) =>
  /- Slowmo /.test(source.Path ?? source.Name ?? "");

/** "Slowmo x4 01m30s +2" from the source's file name. */
export const slowmoLabel = (source: MediaSourceInfo) => {
  const file = (source.Path ?? source.Name ?? "").split(/[\\/]/).pop() ?? "";
  return file.replace(/\.[^.]+$/, "").replace(/^.*?- (?=Slowmo )/, "");
};

export const deleteSlowmoJob = (
  settings: SlowmoSettings,
  id: string,
): Promise<{ ok: boolean }> =>
  slowmoFetch(settings, `/jobs/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

// m:ss.t, tenths so that nudges of 0.5 s are visible
export const formatSeconds = (s: number) => {
  const m = Math.floor(s / 60);
  const rest = (s - m * 60).toFixed(1).padStart(4, "0");
  return `${m}:${rest}`;
};

const MIN_SEGMENT = 0.1;

/** Moves one edge of a segment; clamped at 0, start stays below end. */
export const nudgeSegment = (
  seg: SlowmoSegment,
  edge: "start" | "end",
  delta: number,
): SlowmoSegment => {
  const value = Math.max(0, seg[edge] + delta);
  const next = { ...seg, [edge]: value };
  return next.end - next.start >= MIN_SEGMENT ? next : seg;
};

const sorted = (segments: SlowmoSegment[]) =>
  [...segments].sort((a, b) => a.start - b.start);

/** Position (s) in the original -> position in a version slowed by `factor`. */
export const originalToSlowmo = (
  pos: number,
  segments: SlowmoSegment[],
  factor: number,
) => {
  if (segments.length === 0) return pos * factor;
  let out = pos;
  for (const { start, end } of sorted(segments)) {
    if (end <= pos) out += (factor - 1) * (end - start);
    else if (start < pos) out += (factor - 1) * (pos - start);
  }
  return out;
};

/** Inverse of originalToSlowmo. */
export const slowmoToOriginal = (
  pos: number,
  segments: SlowmoSegment[],
  factor: number,
) => {
  if (segments.length === 0) return pos / factor;
  let extra = 0; // seconds added by the segments before the current one
  for (const { start, end } of sorted(segments)) {
    const slowStart = start + extra;
    const slowEnd = slowStart + factor * (end - start);
    if (pos < slowStart) break;
    if (pos < slowEnd) return start + (pos - slowStart) / factor;
    extra += (factor - 1) * (end - start);
  }
  return pos - extra;
};

const normalizePath = (p: string) => p.split("\\").join("/").toLowerCase();

/** The job that created the version at `path` (its output is the Jellyfin Path). */
export const findJobForPath = (jobs: SlowmoJob[], path?: string | null) =>
  path
    ? jobs.find(
        (j) => j.output && normalizePath(j.output) === normalizePath(path),
      )
    : undefined;

/**
 * Position (s) to resume at when switching from one version to another. A
 * version with no matching job, a slowmo one included, keeps the position.
 */
export const mapPositionBetweenVersions = (
  pos: number,
  from: { path?: string | null; slowmo: boolean },
  to: { path?: string | null; slowmo: boolean },
  jobs: SlowmoJob[],
) => {
  const fromJob = from.slowmo ? findJobForPath(jobs, from.path) : undefined;
  const toJob = to.slowmo ? findJobForPath(jobs, to.path) : undefined;
  if ((from.slowmo && !fromJob) || (to.slowmo && !toJob)) return pos;
  const original = fromJob
    ? slowmoToOriginal(pos, fromJob.segments, fromJob.factor)
    : pos;
  return toJob
    ? originalToSlowmo(original, toJob.segments, toJob.factor)
    : original;
};

/**
 * A time range as fractions (0..1) of the timeline, clamped to it; the order
 * of the ends does not matter. Null when the duration is unknown.
 */
export const rangeFractions = (a: number, b: number, durationSec: number) => {
  // Called from useAnimatedStyle (UI thread): without this directive the call
  // throws there, which closes a release build as soon as a start is marked.
  "worklet";
  if (!(durationSec > 0)) return null;
  const clamp = (v: number) => Math.min(Math.max(v / durationSec, 0), 1);
  const left = clamp(Math.min(a, b));
  return { left, width: clamp(Math.max(a, b)) - left };
};

/** Deep link into the web GUI at the given position of the movie. */
export const slowmoWebGuiUrl = (
  base: string | undefined,
  itemId: string,
  seconds: number,
) =>
  `${(base ?? "").replace(/\/+$/, "")}/#/item/${itemId}?t=${seconds.toFixed(1)}`;

export const NUDGE_STEPS = [0.1, 0.5] as const;

/** Moves the whole segment's edge to an absolute position (keeps the order). */
export const setSegmentEdge = (
  seg: SlowmoSegment,
  edge: "start" | "end",
  value: number,
): SlowmoSegment => nudgeSegment(seg, edge, value - seg[edge]);

/**
 * Where the slowed parts sit in the slowed version's own timeline (seconds):
 * each marked segment starts where the original start maps to and lasts
 * factor times longer. A whole-movie job has no parts to point out.
 */
export const slowedParts = (
  job: Pick<SlowmoJob, "segments" | "factor">,
): SlowmoSegment[] =>
  sorted(job.segments).map((s) => {
    const start = originalToSlowmo(s.start, job.segments, job.factor);
    return { start, end: start + job.factor * (s.end - s.start) };
  });

/** Start of the first part after the position, or null. */
export const nextPartStart = (pos: number, parts: SlowmoSegment[]) =>
  parts.find((p) => p.start > pos + 0.5)?.start ?? null;

/** Start of the part the position is in (past its first 1.5 s) or before it. */
export const prevPartStart = (pos: number, parts: SlowmoSegment[]) =>
  [...parts].reverse().find((p) => p.start < pos - 1.5)?.start ?? null;

/** Queued or running jobs of one movie. */
export const pendingJobsForItem = (jobs: SlowmoJob[], itemId?: string | null) =>
  jobs.filter(
    (j) =>
      j.itemId === itemId && (j.status === "queued" || j.status === "running"),
  );

/** Where to start a finished version: a moment before its first slowed part. */
export const firstPartStartSeconds = (
  job: Pick<SlowmoJob, "segments" | "factor">,
  lead = 2,
) => Math.max((slowedParts(job)[0]?.start ?? 0) - lead, 0);

/** Index (in `segments`, which may be unsorted) of the first segment starting after the position. */
export const nextSegmentIndex = (pos: number, segments: SlowmoSegment[]) => {
  let best: number | null = null;
  segments.forEach((s, i) => {
    if (
      s.start > pos + 0.5 &&
      (best === null || s.start < segments[best].start)
    )
      best = i;
  });
  return best;
};

/** Index of the last segment starting before the position (past its first 1.5 s). */
export const prevSegmentIndex = (pos: number, segments: SlowmoSegment[]) => {
  let best: number | null = null;
  segments.forEach((s, i) => {
    if (
      s.start < pos - 1.5 &&
      (best === null || s.start > segments[best].start)
    )
      best = i;
  });
  return best;
};

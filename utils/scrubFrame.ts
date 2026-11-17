import type {
  BaseItemDto,
  MediaSourceInfo,
} from "@jellyfin/sdk/lib/generated-client/models";
import {
  findJobForPath,
  isSlowmoSource,
  type SlowmoJob,
  slowmoToOriginal,
} from "@/utils/slowmo";

/** AVFoundation reads these containers; Jellyfin may report "mov,mp4,m4a,...". */
const NATIVE_EXTS = ["mp4", "m4v", "mov"];

/** The extension to stream the source as, or null when AVFoundation can't read it. */
export const nativeExt = (container?: string | null) =>
  container
    ?.toLowerCase()
    .split(",")
    .map((c) => c.trim())
    .find((c) => NATIVE_EXTS.includes(c)) ?? null;

/** Frames are grabbed per whole second. */
export const bucketSeconds = (seconds: number) =>
  Math.max(0, Math.floor(seconds));

/** Tiny LRU: bucket key -> file uri. */
export class FrameCache {
  private map = new Map<string, string>();
  constructor(private max = 60) {}
  get(key: string) {
    const v = this.map.get(key);
    if (v !== undefined) {
      this.map.delete(key);
      this.map.set(key, v);
    }
    return v;
  }
  set(key: string, value: string) {
    this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.max) {
      this.map.delete(this.map.keys().next().value as string);
    }
  }
}

/**
 * Which file and time to grab the frame from. A slowmo version (mkv) can't be
 * read natively, so its frame comes from the primary source (id == item id) at
 * the mapped time. Null when nothing readable can be resolved.
 */
export const resolveFrameSource = (
  item: Pick<BaseItemDto, "Id" | "MediaSources">,
  mediaSource: MediaSourceInfo | null | undefined,
  jobs: SlowmoJob[] | undefined,
  seconds: number,
): { sourceId: string; ext: string; seconds: number } | null => {
  if (!item.Id || !mediaSource?.Id) return null;
  if (!isSlowmoSource(mediaSource)) {
    const ext = nativeExt(mediaSource.Container);
    return ext ? { sourceId: mediaSource.Id, ext, seconds } : null;
  }
  const job = findJobForPath(jobs ?? [], mediaSource.Path);
  const primary = item.MediaSources?.find((s) => s.Id === item.Id);
  const ext = nativeExt(primary?.Container);
  if (!job || !ext) return null;
  return {
    sourceId: item.Id,
    ext,
    seconds: slowmoToOriginal(seconds, job.segments, job.factor),
  };
};

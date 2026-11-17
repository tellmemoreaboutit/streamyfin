import {
  bucketSeconds,
  FrameCache,
  nativeExt,
  resolveFrameSource,
} from "./scrubFrame";
import type { SlowmoJob } from "./slowmo";

describe("scrubFrame", () => {
  it("picks natively readable containers", () => {
    expect(nativeExt("mov,mp4,m4a,3gp,3g2,mj2")).toBe("mov");
    expect(nativeExt("mp4")).toBe("mp4");
    expect(nativeExt("matroska,webm")).toBeNull();
  });

  it("buckets to whole seconds", () => {
    expect(bucketSeconds(12.9)).toBe(12);
    expect(bucketSeconds(-3)).toBe(0);
  });

  it("evicts the least recently used entry", () => {
    const c = new FrameCache(2);
    c.set("a", "1");
    c.set("b", "2");
    c.get("a");
    c.set("c", "3");
    expect(c.get("b")).toBeUndefined();
    expect(c.get("a")).toBe("1");
  });

  it("maps slowmo time onto the original and skips unreadable sources", () => {
    const item = {
      Id: "orig",
      MediaSources: [{ Id: "orig", Container: "mp4" }],
    };
    const slow = {
      Id: "slow",
      Container: "matroska",
      Path: "/m/x - Slowmo x2.mkv",
    };
    const job = {
      output: "/m/x - Slowmo x2.mkv",
      segments: [],
      factor: 2,
    } as unknown as SlowmoJob;
    expect(
      resolveFrameSource(item, { Id: "orig", Container: "mp4" }, [], 5),
    ).toEqual({ sourceId: "orig", ext: "mp4", seconds: 5 });
    expect(resolveFrameSource(item, slow, [job], 10)).toEqual({
      sourceId: "orig",
      ext: "mp4",
      seconds: 5,
    });
    expect(resolveFrameSource(item, slow, [], 10)).toBeNull();
    expect(
      resolveFrameSource(item, { Id: "m", Container: "mkv" }, [], 1),
    ).toBeNull();
  });
});

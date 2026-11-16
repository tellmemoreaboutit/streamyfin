import {
  mapPositionBetweenVersions,
  nudgeSegment,
  originalToSlowmo,
  type SlowmoJob,
  slowmoToOriginal,
} from "./slowmo";

const segs = [
  { start: 10, end: 20 },
  { start: 40, end: 50 },
];

describe("position mapping", () => {
  test("before, inside and after segments", () => {
    expect(originalToSlowmo(5, segs, 4)).toBe(5);
    expect(originalToSlowmo(15, segs, 4)).toBe(15 + 3 * 5);
    expect(originalToSlowmo(30, segs, 4)).toBe(30 + 3 * 10);
    expect(originalToSlowmo(60, segs, 4)).toBe(60 + 3 * 20);
  });

  test("whole movie scales by the factor", () => {
    expect(originalToSlowmo(10, [], 3)).toBe(30);
    expect(slowmoToOriginal(30, [], 3)).toBe(10);
  });

  test("the inverse round-trips", () => {
    for (const p of [0, 5, 10, 15, 20, 30, 45, 50, 60]) {
      expect(
        slowmoToOriginal(originalToSlowmo(p, segs, 4), segs, 4),
      ).toBeCloseTo(p);
    }
  });
});

describe("switching versions", () => {
  const job = {
    output: "Z:\\Movies\\A - Slowmo x4.mkv",
    segments: segs,
    factor: 4,
  } as SlowmoJob;
  const orig = { path: "/m/A.mkv", slowmo: false };
  const slow = { path: "z:/movies/a - slowmo x4.mkv", slowmo: true };

  test("maps via the matching job, slashes and case ignored", () => {
    expect(mapPositionBetweenVersions(15, orig, slow, [job])).toBe(30);
    expect(mapPositionBetweenVersions(30, slow, orig, [job])).toBe(15);
  });

  test("keeps the position without a matching job", () => {
    expect(mapPositionBetweenVersions(15, orig, slow, [])).toBe(15);
  });
});

describe("nudge", () => {
  test("clamps at 0 and keeps start below end", () => {
    expect(nudgeSegment({ start: 0.2, end: 5 }, "start", -0.5).start).toBe(0);
    const tight = { start: 1, end: 1.5 };
    expect(nudgeSegment(tight, "start", 0.5)).toBe(tight);
    expect(nudgeSegment(tight, "end", 0.5).end).toBe(2);
  });
});

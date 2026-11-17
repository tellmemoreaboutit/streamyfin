import {
  firstPartStartSeconds,
  isSlowmoSource,
  mapPositionBetweenVersions,
  nextPartStart,
  nextSegmentIndex,
  nudgeSegment,
  originalToSlowmo,
  pendingJobsForItem,
  prevPartStart,
  prevSegmentIndex,
  rangeFractions,
  type SlowmoJob,
  setSegmentEdge,
  slowedParts,
  slowmoToOriginal,
  slowmoWebGuiUrl,
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

describe("timeline helpers", () => {
  test("rangeFractions clamps to the timeline and ignores the order", () => {
    expect(rangeFractions(10, 20, 100)).toEqual({ left: 0.1, width: 0.1 });
    expect(rangeFractions(20, 10, 100)).toEqual({ left: 0.1, width: 0.1 });
    expect(rangeFractions(-5, 150, 100)).toEqual({ left: 0, width: 1 });
    expect(rangeFractions(1, 2, 0)).toBeNull();
  });

  test("setSegmentEdge moves an edge to an absolute time", () => {
    expect(setSegmentEdge({ start: 10, end: 20 }, "end", 25)).toEqual({
      start: 10,
      end: 25,
    });
    const seg = { start: 10, end: 20 };
    expect(setSegmentEdge(seg, "start", 30)).toBe(seg);
  });

  test("slowmoWebGuiUrl", () => {
    expect(slowmoWebGuiUrl("http://h:1/", "abc", 12.34)).toBe(
      "http://h:1/#/item/abc?t=12.3",
    );
  });
});

describe("slowed parts of a version", () => {
  // 10-20 and 40-50 slowed x4: the first part starts at 10 and lasts 40 s,
  // the second starts at 40 + 30 = 70 and lasts 40 s
  const parts = slowedParts({ segments: [...segs].reverse(), factor: 4 });

  test("maps the segments into the slowed timeline", () => {
    expect(parts).toEqual([
      { start: 10, end: 50 },
      { start: 70, end: 110 },
    ]);
  });

  test("a whole-movie job has none", () => {
    expect(slowedParts({ segments: [], factor: 4 })).toEqual([]);
  });

  test("next and previous part jumps", () => {
    expect(nextPartStart(0, parts)).toBe(10);
    expect(nextPartStart(10, parts)).toBe(70);
    expect(nextPartStart(100, parts)).toBeNull();
    expect(prevPartStart(100, parts)).toBe(70);
    // just after a start: back goes to the part before, not to itself
    expect(prevPartStart(71, parts)).toBe(10);
    expect(prevPartStart(5, parts)).toBeNull();
  });
});

describe("pendingJobsForItem", () => {
  const job = (id: string, itemId: string, status: SlowmoJob["status"]) =>
    ({ id, itemId, status }) as SlowmoJob;
  test("keeps queued and running jobs of that movie", () => {
    const jobs = [
      job("a", "m1", "running"),
      job("b", "m1", "done"),
      job("c", "m2", "queued"),
      job("d", "m1", "queued"),
    ];
    expect(pendingJobsForItem(jobs, "m1").map((j) => j.id)).toEqual(["a", "d"]);
  });
});

describe("firstPartStartSeconds", () => {
  test("a moment before the first part, 0 for a whole-movie job", () => {
    expect(firstPartStartSeconds({ segments: segs, factor: 4 })).toBe(8);
    expect(
      firstPartStartSeconds({ segments: [{ start: 1, end: 2 }], factor: 4 }),
    ).toBe(0);
    expect(firstPartStartSeconds({ segments: [], factor: 4 })).toBe(0);
  });
});

describe("segment navigation", () => {
  // Deliberately unsorted: indices refer to the array as stored
  const segs = [
    { start: 50, end: 60 },
    { start: 10, end: 20 },
    { start: 30, end: 40 },
  ];
  test("next picks the earliest start after the position", () => {
    expect(nextSegmentIndex(0, segs)).toBe(1);
    expect(nextSegmentIndex(10, segs)).toBe(2);
    expect(nextSegmentIndex(35, segs)).toBe(0);
    expect(nextSegmentIndex(50, segs)).toBeNull();
    expect(nextSegmentIndex(0, [])).toBeNull();
  });
  test("prev picks the latest start before the position", () => {
    expect(prevSegmentIndex(100, segs)).toBe(0);
    expect(prevSegmentIndex(50.5, segs)).toBe(2);
    expect(prevSegmentIndex(31, segs)).toBe(1);
    expect(prevSegmentIndex(5, segs)).toBeNull();
    expect(prevSegmentIndex(0, [])).toBeNull();
  });
});

describe("isSlowmoSource", () => {
  test("recognises .mp4 and older .mkv versions, not the original", () => {
    const s = (Path: string) => ({ Path }) as never;
    expect(isSlowmoSource(s("/m/A - Slowmo x4 01m30s.mp4"))).toBe(true);
    expect(isSlowmoSource(s("/m/A - Slowmo x4 01m30s.mkv"))).toBe(true);
    expect(isSlowmoSource(s("/m/A.mp4"))).toBe(false);
  });
});

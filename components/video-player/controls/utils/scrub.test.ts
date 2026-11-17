import {
  crossedMark,
  frameStepTarget,
  loopSeekTarget,
  scrubRate,
  scrubSpanMs,
  scrubStep,
} from "./scrub";

describe("scrubSpanMs", () => {
  test("is capped by the movie and 0 means the whole movie", () => {
    expect(scrubSpanMs(300, 7_200_000)).toBe(300_000);
    expect(scrubSpanMs(1800, 600_000)).toBe(600_000);
    expect(scrubSpanMs(0, 600_000)).toBe(600_000);
  });
});

describe("scrubRate", () => {
  test("drops with the vertical distance", () => {
    expect(scrubRate(0)).toBe(1);
    expect(scrubRate(79)).toBe(1);
    expect(scrubRate(-100)).toBe(0.5);
    expect(scrubRate(170)).toBe(0.25);
    expect(scrubRate(400)).toBe(0.1);
  });
  test("is always 1 when fine scrubbing is off", () => {
    expect(scrubRate(400, false)).toBe(1);
  });
});

describe("scrubStep", () => {
  test("moves by span x fraction x rate and clamps", () => {
    expect(scrubStep(100_000, 0.5, 300_000, 1, 1e7)).toBe(250_000);
    expect(scrubStep(100_000, 0.5, 300_000, 0.5, 1e7)).toBe(175_000);
    expect(scrubStep(1_000, -1, 300_000, 1, 1e7)).toBe(0);
    expect(scrubStep(900_000, 1, 300_000, 1, 1_000_000)).toBe(1_000_000);
  });
});

describe("crossedMark", () => {
  test("detects a pass in both directions, not standing before it", () => {
    expect(crossedMark(900, 1100, [1000])).toBe(true);
    expect(crossedMark(1100, 900, [1000])).toBe(true);
    expect(crossedMark(900, 990, [1000])).toBe(false);
    expect(crossedMark(1000, 1100, [1000])).toBe(false);
  });
});

describe("frameStepTarget", () => {
  test("steps one frame and lands mid-frame", () => {
    // 25 fps: frame = 40 ms; at 1000 ms (frame 25) -> middle of frame 26
    expect(frameStepTarget(1000, 25, 1, 60_000)).toBeCloseTo(1060);
    expect(frameStepTarget(1000, 25, -1, 60_000)).toBeCloseTo(980);
  });
  test("stepping again from a mid-frame position moves exactly one more", () => {
    const first = frameStepTarget(1000, 25, 1, 60_000);
    expect(frameStepTarget(first, 25, 1, 60_000)).toBeCloseTo(first + 40);
  });
  test("clamps to the movie", () => {
    expect(frameStepTarget(0, 25, -1, 60_000)).toBe(0);
    expect(frameStepTarget(59_990, 25, 1, 60_000)).toBeCloseTo(59_960);
  });
});

describe("loopSeekTarget", () => {
  const seg = { start: 10, end: 12 };
  test("returns to the start past the end or well before the start", () => {
    expect(loopSeekTarget(12_000, seg)).toBe(10_000);
    expect(loopSeekTarget(5_000, seg)).toBe(10_000);
  });
  test("keeps playing inside the segment", () => {
    expect(loopSeekTarget(11_000, seg)).toBeNull();
    expect(loopSeekTarget(9_500, seg)).toBeNull();
  });
});

import { surfaceScrubTarget } from "./useVideoSlider";

describe("surfaceScrubTarget", () => {
  test("a full-width drag spans the whole duration", () => {
    expect(surfaceScrubTarget(0, 1, 7_200_000)).toBe(7_200_000);
    expect(surfaceScrubTarget(60_000, 0.25, 100_000)).toBe(85_000);
  });

  test("clamps to the timeline", () => {
    expect(surfaceScrubTarget(10_000, -1, 100_000)).toBe(0);
    expect(surfaceScrubTarget(90_000, 1, 100_000)).toBe(100_000);
  });
});

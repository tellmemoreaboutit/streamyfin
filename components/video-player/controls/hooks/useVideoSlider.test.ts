import { renderHook } from "@testing-library/react-native";
import { makeSharedValue } from "@/test-utils/reanimated";
import { useVideoSlider } from "./useVideoSlider";

jest.mock("lodash/debounce", () => (fn: unknown) => fn);

const setup = async () => {
  const progress = makeSharedValue(60_000) as any;
  const { result } = await renderHook(() =>
    useVideoSlider({
      progress,
      isSeeking: makeSharedValue(false) as any,
      isPlaying: true,
      seek: jest.fn(),
      play: jest.fn(),
      pause: jest.fn(),
      calculateTrickplayUrl: jest.fn(),
      showControls: true,
    }),
  );
  result.current.beginSurfaceScrub();
  return result;
};

describe("surface scrub", () => {
  test("a full-width drag covers the span from where it began", async () => {
    const hook = await setup();
    const v = hook.current.moveSurfaceScrub(0.5, 600_000, {
      spanMs: 300_000,
      rate: 1,
    });
    expect(v).toBe(60_000 + 150_000);
  });

  test("changing the rate mid-drag does not move what was scrubbed", async () => {
    const hook = await setup();
    hook.current.moveSurfaceScrub(0.5, 600_000, { spanMs: 300_000, rate: 1 });
    const v = hook.current.moveSurfaceScrub(0.6, 600_000, {
      spanMs: 300_000,
      rate: 0.1,
    });
    expect(v).toBe(60_000 + 150_000 + 0.1 * 0.1 * 300_000);
  });

  test("clamps and ticks when a mark is crossed", async () => {
    const hook = await setup();
    const onMark = jest.fn();
    hook.current.moveSurfaceScrub(0.1, 600_000, {
      spanMs: 300_000,
      rate: 1,
      marks: [80_000],
      onMark,
    });
    expect(onMark).toHaveBeenCalledTimes(1);
    expect(
      hook.current.moveSurfaceScrub(-5, 600_000, { spanMs: 300_000, rate: 1 }),
    ).toBe(0);
  });
});

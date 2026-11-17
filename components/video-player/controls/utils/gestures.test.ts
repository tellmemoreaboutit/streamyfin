import {
  continuesSeekChain,
  doubleTapSeconds,
  exitZoneHeight,
  extendSeekChain,
  inExitZone,
  isExitSwipe,
} from "./gestures";

describe("inExitZone", () => {
  test("is the top share of the screen", () => {
    expect(inExitZone(100, 800, 20)).toBe(true);
    expect(inExitZone(159, 800, 20)).toBe(true);
    expect(inExitZone(160, 800, 20)).toBe(false);
    expect(inExitZone(250, 800, 33)).toBe(true);
    expect(inExitZone(0, 0, 20)).toBe(false);
    expect(exitZoneHeight(800, 25)).toBe(200);
  });
});

describe("isExitSwipe", () => {
  test("needs a long, quick, mostly horizontal swipe in either direction", () => {
    expect(isExitSwipe(-120, 10, 300)).toBe(true);
    expect(isExitSwipe(120, -20, 300)).toBe(true);
    expect(isExitSwipe(-40, 0, 200)).toBe(false);
    expect(isExitSwipe(-120, 100, 300)).toBe(false);
    expect(isExitSwipe(-120, 0, 1500)).toBe(false);
  });
});

describe("doubleTapSeconds", () => {
  test("left half rewinds, right half skips forward, by the settings", () => {
    expect(doubleTapSeconds(50, 400, 5, 10)).toBe(-5);
    expect(doubleTapSeconds(350, 400, 5, 10)).toBe(10);
    expect(doubleTapSeconds(200, 400, 5, 10)).toBe(10);
  });
  test("a zero or missing setting seeks nothing", () => {
    expect(doubleTapSeconds(350, 400, 5, 0)).toBe(0);
    expect(Math.abs(doubleTapSeconds(50, 400, undefined as any, 10))).toBe(0);
  });
});

describe("seek chain", () => {
  test("accumulates on the same side within the window", () => {
    const a = extendSeekChain(null, "forward", 10, 1000);
    const b = extendSeekChain(a, "forward", 10, 1400);
    expect(b.total).toBe(20);
    expect(continuesSeekChain(b, 1900)).toBe(true);
    expect(continuesSeekChain(b, 2200)).toBe(false);
  });
  test("restarts on the other side or after the window", () => {
    const a = extendSeekChain(null, "forward", 10, 1000);
    expect(extendSeekChain(a, "back", -5, 1200).total).toBe(-5);
    expect(extendSeekChain(a, "forward", 10, 3000).total).toBe(10);
  });
});

import { COOLDOWN_MS, registerFailure, shouldLock } from "./appLock";

describe("shouldLock", () => {
  it("never locks when disabled or never backgrounded", () => {
    expect(shouldLock(0, 10_000, 0, false)).toBe(false);
    expect(shouldLock(null, 10_000, 0, true)).toBe(false);
  });

  it("locks once the grace period has passed", () => {
    expect(shouldLock(1_000, 1_000, 0, true)).toBe(true);
    expect(shouldLock(0, 59_000, 60, true)).toBe(false);
    expect(shouldLock(0, 60_000, 60, true)).toBe(true);
  });
});

describe("registerFailure", () => {
  it("starts a cooldown on every fifth failure only", () => {
    expect(registerFailure(3, 100)).toEqual({ failed: 4, cooldownUntil: 0 });
    expect(registerFailure(4, 100)).toEqual({
      failed: 5,
      cooldownUntil: 100 + COOLDOWN_MS,
    });
    expect(registerFailure(9, 0).cooldownUntil).toBe(COOLDOWN_MS);
  });
});

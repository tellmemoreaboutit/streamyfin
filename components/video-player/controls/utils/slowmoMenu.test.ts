import { buildSlowmoMenuGroups } from "./slowmoMenu";

const base = {
  t: (k: string) => k,
  segmentCount: 0,
  hasServerUrl: true,
  modeOn: false,
  onToggleMode: () => {},
  onClear: () => {},
  onSendWhole: () => {},
  onOpenWebGui: () => {},
  onSend: () => {},
};

describe("buildSlowmoMenuGroups", () => {
  const types = (g: any[]) => g.map((x) => x.options.map((o: any) => o.type));

  test("no segments: mode toggle, web GUI, whole movie", () => {
    const g = buildSlowmoMenuGroups(base);
    expect(types(g)).toEqual([
      ["toggle"],
      ["action"],
      ["radio", "radio", "radio", "radio", "radio"],
    ]);
    expect((g[0].options[0] as any).value).toBe(false);
  });

  test("segments add the factor picker and clear before the whole movie", () => {
    const g = buildSlowmoMenuGroups({
      ...base,
      segmentCount: 2,
      lastFactor: 3,
    });
    expect(g).toHaveLength(5);
    const radios = g[2].options as any[];
    expect(radios.map((o) => o.label)).toEqual(["x2", "x3", "x4", "x5", "x6"]);
    expect(radios.filter((o) => o.selected).map((o) => o.value)).toEqual(["3"]);
    expect(types(g)[3]).toEqual(["action"]);
  });

  test("a remembered factor that is not offered falls back to x4", () => {
    for (const lastFactor of [undefined, 9, Number.NaN]) {
      const g = buildSlowmoMenuGroups({ ...base, segmentCount: 1, lastFactor });
      const sel = (g[2].options as any[]).filter((o) => o.selected);
      expect(sel.map((o) => o.value)).toEqual(["4"]);
    }
  });

  test("no server URL: only the toggle (and segment groups), never empty", () => {
    expect(
      types(buildSlowmoMenuGroups({ ...base, hasServerUrl: false })),
    ).toEqual([["toggle"]]);
    const g = buildSlowmoMenuGroups({
      ...base,
      hasServerUrl: false,
      segmentCount: 1,
    });
    expect(g).toHaveLength(3);
    expect(g.every((x) => x.options.length > 0)).toBe(true);
  });

  test("callbacks are wired", () => {
    const onToggleMode = jest.fn();
    const onClear = jest.fn();
    const onSendWhole = jest.fn();
    const g = buildSlowmoMenuGroups({
      ...base,
      segmentCount: 1,
      onToggleMode,
      onClear,
      onSendWhole,
    });
    (g[0].options[0] as any).onToggle();
    (g[3].options[0] as any).onPress();
    (g[4].options[1] as any).onPress();
    expect(onToggleMode).toHaveBeenCalled();
    expect(onClear).toHaveBeenCalled();
    expect(onSendWhole).toHaveBeenCalledWith(3);
  });

  test("labels and values are strings, radio values unique per group", () => {
    const g = buildSlowmoMenuGroups({ ...base, segmentCount: 1 });
    for (const grp of g) {
      const opts = grp.options as any[];
      for (const o of opts) expect(typeof o.label).toBe("string");
      const values = opts.filter((o) => o.type === "radio").map((o) => o.value);
      expect(new Set(values).size).toBe(values.length);
    }
  });
});

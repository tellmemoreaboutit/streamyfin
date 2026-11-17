import { buildSlowmoMenuGroups } from "./slowmoMenu";

const base = {
  t: (k: string) => k,
  segmentCount: 0,
  hasServerUrl: true,
  onOpenWebGui: () => {},
  onSend: () => {},
};

describe("buildSlowmoMenuGroups", () => {
  test("no segments: only the web GUI action", () => {
    const g = buildSlowmoMenuGroups(base);
    expect(g).toHaveLength(1);
    expect(g[0].options.map((o) => o.type)).toEqual(["action"]);
  });

  test("segments add a factor picker with exactly one selected", () => {
    const g = buildSlowmoMenuGroups({
      ...base,
      segmentCount: 2,
      lastFactor: 3,
    });
    expect(g).toHaveLength(2);
    const radios = g[1].options as any[];
    expect(radios.map((o) => o.label)).toEqual(["x2", "x3", "x4", "x5", "x6"]);
    expect(radios.filter((o) => o.selected).map((o) => o.value)).toEqual(["3"]);
  });

  test("a remembered factor that is not offered falls back to x4", () => {
    for (const lastFactor of [undefined, 9, Number.NaN]) {
      const g = buildSlowmoMenuGroups({ ...base, segmentCount: 1, lastFactor });
      const sel = (g[1].options as any[]).filter((o) => o.selected);
      expect(sel.map((o) => o.value)).toEqual(["4"]);
    }
  });

  test("no server URL and no segments gives no empty group", () => {
    expect(buildSlowmoMenuGroups({ ...base, hasServerUrl: false })).toEqual([]);
    const g = buildSlowmoMenuGroups({
      ...base,
      hasServerUrl: false,
      segmentCount: 1,
    });
    expect(g).toHaveLength(1);
    expect(g.every((x) => x.options.length > 0)).toBe(true);
  });

  test("labels and values are strings, radio values unique", () => {
    const g = buildSlowmoMenuGroups({ ...base, segmentCount: 1 });
    const opts = g.flatMap((x) => x.options) as any[];
    for (const o of opts) expect(typeof o.label).toBe("string");
    const values = opts.filter((o) => o.type === "radio").map((o) => o.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

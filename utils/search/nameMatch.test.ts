import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { makeMatcher, mergeNameMatches, normalize } from "./nameMatch";

describe("normalize", () => {
  it("lowercases and strips diacritics incl. ł", () => {
    expect(normalize("Żółw ŁÓDŹ")).toBe("zolw lodz");
  });
});

describe("makeMatcher", () => {
  it("matches mid-word and across separators", () => {
    expect(makeMatcher("0123")("DJI_20240512_0123")).toBe(true);
    expect(makeMatcher("dron")("Wakacje-dron-2023")).toBe(true);
    expect(makeMatcher("a.b")("x a.b y")).toBe(true);
    expect(makeMatcher("nope")("Wakacje")).toBe(false);
  });
  it("ignores case and diacritics", () => {
    expect(makeMatcher("zolw")("Żółw")).toBe(true);
    expect(makeMatcher("ŻÓŁW")("zolw")).toBe(true);
  });
  it("supports * and ?", () => {
    expect(makeMatcher("dji*2024")("DJI_20240512")).toBe(true);
    expect(makeMatcher("dji*2025")("DJI_20240512")).toBe(false);
    expect(makeMatcher("*plaza*")("Na plazy - plaza 1")).toBe(true);
    expect(makeMatcher("IMG_00??")("my img_0042.mov")).toBe(true);
    expect(makeMatcher("IMG_00??")("IMG_004")).toBe(false);
  });
  it("treats regex specials literally", () => {
    expect(makeMatcher("(a)")("x (a) y")).toBe(true);
    expect(makeMatcher("a.c")("abc")).toBe(false);
    expect(makeMatcher("a+b")("a+b")).toBe(true);
    expect(makeMatcher("a+b")("aab")).toBe(false);
    expect(makeMatcher("a.*c")("abc")).toBe(false);
    expect(makeMatcher("a.?c")("a.xc")).toBe(true);
  });
  it("matches nothing for empty or wildcard-only queries", () => {
    expect(makeMatcher("")("abc")).toBe(false);
    expect(makeMatcher("  ")("abc")).toBe(false);
    expect(makeMatcher("*")("abc")).toBe(false);
    expect(makeMatcher("??")("abc")).toBe(false);
  });
});

describe("mergeNameMatches", () => {
  const item = (Id: string, Name: string, Type = "Movie") =>
    ({ Id, Name, Type }) as BaseItemDto;
  const index = [
    item("1", "DJI_0123"),
    item("2", "Wakacje-dron"),
    item("3", "dron episode", "Episode"),
    item("4", "dron home", "Video"),
  ];
  it("puts server first, dedupes, adds Video to movies, honours the limit", () => {
    const server = [item("2", "Wakacje-dron")];
    const out = mergeNameMatches({
      server,
      index,
      types: ["Movie"],
      query: "dron",
      limit: 10,
    });
    expect(out.map((i) => i.Id)).toEqual(["2", "4"]);
    expect(
      mergeNameMatches({
        server,
        index,
        types: ["Movie"],
        query: "dron",
        limit: 1,
      }),
    ).toHaveLength(1);
  });
  it("answers wildcard queries from the index only", () => {
    const out = mergeNameMatches({
      server: [item("9", "Other")],
      index,
      types: ["Movie"],
      query: "dji*",
      limit: 10,
    });
    expect(out.map((i) => i.Id)).toEqual(["1"]);
  });
});

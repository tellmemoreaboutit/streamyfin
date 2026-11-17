import { adjacentIds, sortSiblings } from "./adjacentIds";

const list = [{ Id: "a" }, { Id: "b" }, { Id: "c" }];

describe("adjacentIds", () => {
  it("returns both neighbours in the middle", () => {
    expect(adjacentIds(list, "b")).toEqual({
      previous: { Id: "a" },
      next: { Id: "c" },
    });
  });

  it("has no previous at the start and no next at the end", () => {
    expect(adjacentIds(list, "a").previous).toBeNull();
    expect(adjacentIds(list, "c").next).toBeNull();
  });

  it("returns nothing for a missing id", () => {
    expect(adjacentIds(list, "zzz")).toEqual({ previous: null, next: null });
  });
});

describe("sortSiblings", () => {
  it("sorts by SortName ignoring case and breaks ties by Id", () => {
    const sorted = sortSiblings([
      { Id: "3", SortName: "b" },
      { Id: "2", SortName: "A" },
      { Id: "1", SortName: "a" },
    ]);
    expect(sorted.map((e) => e.Id)).toEqual(["1", "2", "3"]);
  });
});

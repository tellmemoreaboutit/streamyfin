import {
  buildContextIdsRequest,
  buildFolderSiblingsParams,
} from "./playContext";

describe("playContext", () => {
  it("keeps the list query and makes it ids-only with paging", () => {
    const r = buildContextIdsRequest(
      { userId: "u", parentId: "p", sortBy: ["DateCreated"], limit: 5 },
      100,
      50,
    );
    expect(r).toMatchObject({
      parentId: "p",
      sortBy: ["DateCreated"],
      startIndex: 100,
      limit: 50,
      fields: [],
      enableImages: false,
      enableUserData: false,
    });
  });

  it("folder fallback uses the saved sort, else SortName ascending", () => {
    expect(
      buildFolderSiblingsParams("u", "p", "DateCreated", "Descending"),
    ).toMatchObject({
      sortBy: ["DateCreated", "SortName"],
      sortOrder: ["Descending"],
      recursive: false,
    });
    expect(buildFolderSiblingsParams("u", "p")).toMatchObject({
      sortBy: ["SortName"],
      sortOrder: ["Ascending"],
    });
  });
});

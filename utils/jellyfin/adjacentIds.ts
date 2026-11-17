interface SiblingLike {
  Id?: string | null;
  Name?: string | null;
  SortName?: string | null;
}

/** SortName ascending (case-insensitive), ties broken by Id so the order is stable. */
export function sortSiblings<T extends SiblingLike>(list: T[]): T[] {
  const key = (e: T) => (e.SortName ?? e.Name ?? "").toLowerCase();
  return [...list].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    if (ka !== kb) return ka < kb ? -1 : 1;
    const ia = a.Id ?? "";
    const ib = b.Id ?? "";
    return ia < ib ? -1 : ia > ib ? 1 : 0;
  });
}

/** Neighbours of `currentId` in an ordered list; both null when it is absent. */
export function adjacentIds<T extends SiblingLike>(
  list: T[],
  currentId: string | null | undefined,
): { previous: T | null; next: T | null } {
  const i = list.findIndex((e) => e.Id === currentId);
  if (i < 0) return { previous: null, next: null };
  return { previous: list[i - 1] ?? null, next: list[i + 1] ?? null };
}

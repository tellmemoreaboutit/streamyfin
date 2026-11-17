interface SiblingLike {
  Id?: string | null;
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

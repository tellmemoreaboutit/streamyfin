import type {
  BaseItemDto,
  BaseItemKind,
} from "@jellyfin/sdk/lib/generated-client/models";

/** Lowercase, without diacritics; ł has no decomposition so it is mapped by hand. */
export const normalize = (s: string): string =>
  s.toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[̀-ͯ]/g, "");

export const hasWildcard = (query: string): boolean => /[*?]/.test(query);

/** The query for the server's own search, which knows no wildcards. */
export const stripWildcards = (query: string): string =>
  query.replace(/[*?]+/g, " ").trim();

/**
 * Name test for a query. Without wildcards: normalized substring. With `*`
 * (any run) or `?` (one character): a glob that matches anywhere in the name,
 * i.e. an implicit `*` on both ends. Everything else is literal. An empty or
 * wildcard-only query matches nothing.
 */
export const makeMatcher = (query: string): ((name: string) => boolean) => {
  const q = normalize(query.trim());
  if (!q.replace(/[*?]/g, "")) return () => false;
  if (!hasWildcard(q)) return (name) => normalize(name).includes(q);

  const source = q
    .split("")
    .map((c) =>
      c === "*"
        ? ".*"
        : c === "?"
          ? "."
          : c.replace(/[.+^${}()|[\]\\]/g, "\\$&"),
    )
    .join("");
  const re = new RegExp(source, "s");
  return (name) => re.test(normalize(name));
};

/**
 * Combines the server's answer with the client-side name index. A wildcard
 * query is answered by the index alone (the server cannot); otherwise the
 * server's results come first, then index matches not already present.
 */
export const mergeNameMatches = ({
  server,
  index,
  types,
  query,
  limit,
}: {
  server: BaseItemDto[];
  index: BaseItemDto[];
  types: BaseItemKind[];
  query: string;
  limit: number;
}): BaseItemDto[] => {
  const matches = makeMatcher(query);
  const wanted = (i: BaseItemDto) =>
    !!i.Type &&
    // Home videos are Video items; the Movies section covers them.
    (types.includes(i.Type) || (i.Type === "Video" && types.includes("Movie")));
  const local = index.filter((i) => wanted(i) && matches(i.Name ?? ""));
  if (hasWildcard(query)) return local.slice(0, limit);

  const seen = new Set(server.map((i) => i.Id));
  return [...server, ...local.filter((i) => !seen.has(i.Id))].slice(0, limit);
};

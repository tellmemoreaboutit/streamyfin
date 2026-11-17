import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client";
import { getLibraryApi } from "@jellyfin/sdk/lib/utils/api";
import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useCallback, useMemo } from "react";
import { apiAtom, userAtom } from "@/providers/JellyfinProvider";
import {
  getSortByPreference,
  getSortOrderPreference,
  sortByPreferenceAtom,
  sortOrderPreferenceAtom,
} from "@/utils/atoms/filters";
import {
  buildContextIdsRequest,
  buildFolderSiblingsParams,
  playContextAtom,
} from "@/utils/atoms/playContext";
import { adjacentIds } from "@/utils/jellyfin/adjacentIds";

const PAGE = 2000;
const MAX_ITEMS = 20000;

/**
 * Previous/next video in the order of the list the item was opened from (see
 * playContextAtom). Without that list, or when the item is not in it, the
 * videos of the same parent folder in the sort saved for it (SortName
 * ascending by default). The server order is used as is. Only ids are listed;
 * `fetchFull` loads the full neighbour on demand, since playback needs its
 * media sources and resume position.
 */
export const useSiblingItems = (item?: BaseItemDto | null, enabled = true) => {
  const api = useAtomValue(apiAtom);
  const user = useAtomValue(userAtom);
  const context = useAtomValue(playContextAtom);
  const sortByPref = useAtomValue(sortByPreferenceAtom);
  const sortOrderPref = useAtomValue(sortOrderPreferenceAtom);
  const parentId = item?.ParentId;
  const active =
    enabled &&
    !!api &&
    !!user?.Id &&
    !!parentId &&
    (item?.Type === "Movie" || item?.Type === "Video");

  const fetchIds = useCallback(
    async (
      params: Parameters<typeof buildContextIdsRequest>[0],
      options?: Parameters<ReturnType<typeof getLibraryApi>["getItems"]>[1],
    ) => {
      const ids: { Id?: string | null }[] = [];
      for (let start = 0; start < MAX_ITEMS; start += PAGE) {
        const res = await getLibraryApi(api!).getItems(
          buildContextIdsRequest(params, start, PAGE),
          options,
        );
        const items = res.data.Items ?? [];
        ids.push(...items.map((i) => ({ Id: i.Id })));
        if (
          items.length < PAGE ||
          ids.length >= (res.data.TotalRecordCount ?? 0)
        )
          break;
      }
      return ids;
    },
    [api],
  );

  // The context is part of the key: different lists never share a cache.
  const { data: contextData, isPending: contextPending } = useQuery({
    queryKey: ["siblingItems", "context", context],
    queryFn: () => fetchIds(context!.params, context!.options),
    enabled: active && !!context,
    staleTime: 60_000,
  });
  const inContext = !!context && !!contextData?.some((e) => e.Id === item?.Id);

  // Fallback: no context, or the item is not in it.
  const { data: folderData } = useQuery({
    queryKey: ["siblingItems", "folder", parentId, sortByPref, sortOrderPref],
    queryFn: () =>
      fetchIds(
        buildFolderSiblingsParams(
          user!.Id!,
          parentId!,
          getSortByPreference(parentId!, sortByPref),
          getSortOrderPreference(parentId!, sortOrderPref),
        ),
      ),
    enabled: active && !inContext && !(context && contextPending),
    staleTime: 60_000,
  });
  const data = inContext ? contextData : folderData;

  const { previous, next } = useMemo(
    () => adjacentIds(data ?? [], item?.Id),
    [data, item?.Id],
  );

  const fetchFull = useCallback(
    async (id: string): Promise<BaseItemDto | null> => {
      if (!api || !user?.Id) return null;
      const res = await getLibraryApi(api).getItem({
        userId: user.Id,
        itemId: id,
      });
      return res.data;
    },
    [api, user?.Id],
  );

  // Hidden for a lone item or a failed/pending list.
  const visible = active && (data?.length ?? 0) > 1;
  return { visible, previous, next, fetchFull };
};

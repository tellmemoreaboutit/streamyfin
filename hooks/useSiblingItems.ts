import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client";
import { getLibraryApi } from "@jellyfin/sdk/lib/utils/api";
import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useCallback, useMemo } from "react";
import { apiAtom, userAtom } from "@/providers/JellyfinProvider";
import { adjacentIds, sortSiblings } from "@/utils/jellyfin/adjacentIds";

/**
 * Previous/next video among the items sharing the current one's parent folder,
 * for home-video style libraries (Movie/Video items, no series). Only the id
 * and sort fields are listed; `fetchFull` loads the full neighbour on demand,
 * since playback needs its media sources and resume position.
 */
export const useSiblingItems = (item?: BaseItemDto | null, enabled = true) => {
  const api = useAtomValue(apiAtom);
  const user = useAtomValue(userAtom);
  const parentId = item?.ParentId;
  const active =
    enabled &&
    !!api &&
    !!user?.Id &&
    !!parentId &&
    (item?.Type === "Movie" || item?.Type === "Video");

  const { data } = useQuery({
    queryKey: ["siblingItems", parentId],
    queryFn: async () => {
      const res = await getLibraryApi(api!).getItems({
        userId: user!.Id!,
        parentId: parentId!,
        includeItemTypes: ["Movie", "Video"],
        recursive: false,
        fields: ["ParentId"],
        enableUserData: false,
        enableImages: false,
      });
      return sortSiblings(res.data.Items ?? []);
    },
    enabled: active,
    staleTime: 60_000,
  });

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

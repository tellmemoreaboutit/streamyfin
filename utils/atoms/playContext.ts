import type { LibraryApiGetItemsRequest } from "@jellyfin/sdk/lib/generated-client/api/library-api";
import type { RawAxiosRequestConfig } from "axios";
import { atom } from "jotai";

/**
 * The list an item was opened from (a library or folder grid): its getItems
 * query without paging. Prev/next in the player walks this same list, in the
 * same order. In memory only; null when opened from anywhere else.
 */
export interface PlayContext {
  params: LibraryApiGetItemsRequest;
  options?: RawAxiosRequestConfig;
}

export const playContextAtom = atom<PlayContext | null>(null);

/** Ids-only page of the context's list (server order is authoritative). */
export const buildContextIdsRequest = (
  params: LibraryApiGetItemsRequest,
  startIndex: number,
  limit: number,
): LibraryApiGetItemsRequest => ({
  ...params,
  startIndex,
  limit,
  fields: [],
  enableUserData: false,
  enableImages: false,
  enableTotalRecordCount: true,
});

/** Query for a folder's videos in the sort saved for it; SortName breaks ties. */
export const buildFolderSiblingsParams = (
  userId: string,
  parentId: string,
  sortBy?: string | null,
  sortOrder?: string | null,
): LibraryApiGetItemsRequest => ({
  userId,
  parentId,
  includeItemTypes: ["Movie", "Video"],
  recursive: false,
  sortBy: [...new Set([sortBy || "SortName", "SortName"])] as any,
  sortOrder: [(sortOrder || "Ascending") as any],
});

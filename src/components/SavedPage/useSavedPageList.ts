import { useLoadMore } from "@/lib/hooks/useLoadMore";
import { savedPageListLimit } from "./savedPageHelpers";

export const useSavedPageList = <T>(
  initialItems: T[],
  fetchMore: (limit: number, offset: number) => Promise<{ items: T[] }>,
) =>
  useLoadMore({
    initialItems,
    // A short first page means there's nothing more to load
    initialTotalCount:
      initialItems.length < savedPageListLimit ? initialItems.length : undefined,
    limit: savedPageListLimit,
    fetchMore,
  });

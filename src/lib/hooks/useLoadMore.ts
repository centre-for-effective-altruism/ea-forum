import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";

export const useLoadMore = <T>({
  initialItems,
  initialTotalCount,
  limit: limit_,
  fetchMore: fetchMore_,
}: {
  initialItems: T[];
  initialTotalCount?: number;
  limit?: number;
  fetchMore: (
    limit: number,
    offset: number,
  ) => Promise<{ items: T[]; totalCount?: number }>;
}) => {
  const fetchMore = useRef(fetchMore_);
  const limit = useRef(limit_ || initialItems.length || 10);
  // Guards against re-entrant loads (rapid clicks, or the auto-load effect
  // firing again before `loading` state has propagated).
  const loadingRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(initialItems.length);
  // Set once a page returns fewer items than requested: the server has no more,
  // even if `totalCount` is unknown or briefly over-reports.
  const [reachedEnd, setReachedEnd] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [totalCount, setTotalCount] = useState(initialTotalCount);

  const onLoadMore = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    const offset_ = offset;
    setOffset((offset) => offset + limit.current);
    setLoading(true);
    try {
      const data = await fetchMore.current(limit.current, offset_);
      setItems((items) => [...items, ...data.items]);
      // Later pages omit the count (the client already has it); only update
      // when the server actually returns one.
      if (data.totalCount !== undefined) {
        setTotalCount(data.totalCount);
      }
      if (data.items.length < limit.current) {
        setReachedEnd(true);
      }
    } catch (e) {
      console.error("Error loading more:", e);
      toast.error("Error loading more");
      setReachedEnd(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [offset]);

  // Derived from the freshly-rendered items/total rather than written from
  // inside the setItems updater. Using the total stops at an exact multiple of
  // the limit without a wasted empty request; `reachedEnd` covers the case
  // where the total is unknown or over-reports.
  const canLoadMore =
    !reachedEnd && (totalCount === undefined || items.length < totalCount);

  return {
    items,
    loading,
    limit: limit.current,
    canLoadMore,
    onLoadMore,
    totalCount,
  };
};

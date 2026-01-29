import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";

export const useLoadMore = <T>({
  initialItems,
  limit: limit_,
  fetchMore: fetchMore_,
}: {
  initialItems: T[];
  limit?: number;
  fetchMore: (limit: number, offset: number) => Promise<T[]>;
}) => {
  const fetchMore = useRef(fetchMore_);
  const limit = useRef(limit_ || initialItems.length || 10);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(initialItems.length);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const [items, setItems] = useState(initialItems);

  const onLoadMore = useCallback(async () => {
    const offset_ = offset;
    setOffset((offset) => offset + limit.current);
    setLoading(true);
    try {
      const data = await fetchMore.current(limit.current, offset_);
      setItems((items) => [...items, ...data]);
      if (data.length < limit.current) {
        setCanLoadMore(false);
      }
    } catch (e) {
      console.error("Error loading more:", e);
      toast.error("Error loading more");
      setCanLoadMore(false);
    } finally {
      setLoading(false);
    }
  }, [offset]);

  return {
    items,
    loading,
    limit: limit.current,
    canLoadMore,
    onLoadMore,
  };
};

import {
  DependencyList,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import stringify from "json-stringify-deterministic";
import type { JsonRecord } from "../typeHelpers";
import { captureException } from "@sentry/nextjs";
import { useTracking } from "../analyticsEvents";
import { rpc } from "../rpc";

type LoadProps = {
  rpc: typeof rpc;
  limit: number;
  offset: number;
};

export const useLoad = <T>(
  load: (props: LoadProps) => Promise<T[]>,
  dependencies: DependencyList = [],
  {
    initial = [],
    pageSize = 10,
    eventName = "loadMore",
    eventProps,
    disabled,
  }: Readonly<{
    initial?: T[];
    pageSize?: number;
    eventName?: string;
    eventProps?: JsonRecord;
    disabled?: boolean;
  }> = {},
) => {
  const { captureEvent } = useTracking();
  const [value, setValue] = useState<T[]>(initial);
  const [loading, setLoading] = useState(initial.length === 0 && !disabled);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const loadingRef = useRef(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedLoad = useCallback(load, dependencies);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedEventProps = useMemo(() => eventProps, [stringify(eventProps)]);

  const loadMoreWithOffset = useCallback(
    async (offset: number) => {
      if (disabled || loadingRef.current) {
        return;
      }
      loadingRef.current = true;
      setLoading(true);
      try {
        const newValues = await memoizedLoad({ rpc, limit: pageSize, offset });
        setValue((values) => [...values, ...newValues]);
        if (newValues.length < pageSize) {
          setCanLoadMore(false);
        }
        if (offset > 0) {
          captureEvent(eventName, {
            offset,
            ...memoizedEventProps,
          });
        }
      } catch (e) {
        console.error("Error loading:", e);
        captureException(e);
        setCanLoadMore(false);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [disabled, captureEvent, memoizedLoad, pageSize, eventName, memoizedEventProps],
  );

  const loadMore = useCallback(
    () => loadMoreWithOffset(value.length),
    [loadMoreWithOffset, value.length],
  );

  useEffect(() => {
    if (!disabled && initial.length === 0) {
      setValue([]);
      setCanLoadMore(true);
      loadingRef.current = false;
      void loadMoreWithOffset(0);
    }
  }, [disabled, initial.length, loadMoreWithOffset]);

  return {
    value,
    loading,
    canLoadMore,
    loadMore,
  };
};

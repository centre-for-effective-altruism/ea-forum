import { useCallback, useMemo } from "react";
import { LRUCache } from "lru-cache";

/**
 * Persistant cache for use inside react components.
 * If passing in `options` make sure to cache the object as a global or with
 * useMemo/useState, otherwise the cache will be destroyed and recreated on
 * every render
 */
export const useLRUCache = <
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  Key extends {},
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  Value extends {},
  FetchMethod = unknown,
>(
  createValue: (key: Key) => Value,
  options?: Partial<LRUCache.Options<Key, Value, FetchMethod>>,
) => {
  const cache = useMemo(() => {
    return new LRUCache<Key, Value, FetchMethod>({
      updateAgeOnGet: false,
      max: 100,
      ...options,
    });
  }, [options]);

  const getWithCache = useCallback(
    (key: Key) => {
      const cachedValue = cache.get(key);
      if (cachedValue !== undefined) {
        return cachedValue;
      }
      const createdValue = createValue(key);
      cache.set(key, createdValue);
      return createdValue;
    },
    [cache, createValue],
  );

  return getWithCache;
};

import { useCallback, useEffect, useMemo, useState } from "react";
import type { z, ZodType } from "zod/v4";
import { AdaptivePoller } from "./utils/AdaptivePoller";
import { LRUCache } from "lru-cache";
import stringify from "json-stringify-deterministic";

type ContainsSlash<S extends string> = S extends `${string}/${string}`
  ? true
  : false;

// Any string that does NOT contain a slash
type Word<S extends string> = ContainsSlash<S> extends true ? never : S;

// Recursive path checker, assuming no leading slash
type Segments<S extends string> = S extends `${infer Head}/${infer Tail}`
  ? Word<Head> extends never
    ? never
    : Word<Head> extends string
      ? Segments<Tail> extends never
        ? never
        : S
      : never
  : Word<S> extends never
    ? never
    : S;

type AbsolutePath<S extends string> = S extends `/${infer Rest}`
  ? Segments<Rest> extends never
    ? never
    : `/${Segments<Rest>}`
  : never;

type BracketParam<S extends string> = S extends `[${infer Param}]` ? Param : never;

type BracketParams<S extends string> = S extends `/${infer Rest}`
  ? Rest extends `${infer Head}/${infer Tail}`
    ? BracketParam<Head> | BracketParams<`/${Tail}`>
    : BracketParam<Rest>
  : never;

type ApiRouteOptions<Endpoint extends string, SearchParams, ResponseBody> = {
  endpoint: Endpoint;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  access: "all" | "logged-in" | "admins";
  searchParams?: ZodType<SearchParams>;
  responseSchema: ZodType<ResponseBody>;
};

type UseApiRouteProps<
  Endpoint extends string,
  Path extends AbsolutePath<Endpoint>,
  Params extends BracketParams<Path>,
  SearchParams,
> = {
  // TODO Strongly type params
  params: Record<Params, string>;
  searchParams?: z.output<SearchParams>;
  pollIntervalMs?: number;
  skip?: boolean;
};

type FetchedResult<ResponseBody> = {
  status: number;
  json: ResponseBody;
};

export class ApiRoute<
  Endpoint extends string,
  Path extends AbsolutePath<Endpoint>,
  Params extends BracketParams<Path>,
  SearchParams,
  ResponseBody,
> {
  private cache = new LRUCache<string, Promise<FetchedResult<ResponseBody>>>({
    max: 100,
  });

  constructor(
    private readonly options: ApiRouteOptions<Endpoint, SearchParams, ResponseBody>,
  ) {}

  async fetch(
    params: Record<Params, string>,
    searchParams?: z.output<SearchParams>,
  ): Promise<FetchedResult<ResponseBody>> {
    let endpoint: string = this.options.endpoint;
    for (const param in params) {
      const value = params[param];
      endpoint = endpoint.replaceAll(`[${param}]`, value);
    }
    if (searchParams) {
      endpoint += "?" + new URLSearchParams(searchParams).toString();
    }
    const result = await fetch(endpoint, {
      method: this.options.method,
      headers: {
        "Content-Type": "application/json",
      },
    });
    return { status: result.status, json: await result.json() };
  }

  fetchWithCache(
    params: Record<Params, string>,
    searchParams: z.output<SearchParams> | undefined,
    stringifiedParams?: string,
    stringifiedSearchParams?: string,
  ): Promise<FetchedResult<ResponseBody>> {
    stringifiedParams ??= stringify(params);
    stringifiedSearchParams ??= stringify(searchParams);
    const key = stringifiedParams + stringifiedSearchParams;
    const cachedValue = this.cache.get(key);
    if (cachedValue) {
      return cachedValue;
    }
    const value = this.fetch(params, searchParams);
    this.cache.set(key, value);
    return value;
  }

  use({
    params,
    searchParams,
    pollIntervalMs,
    skip = false,
  }: UseApiRouteProps<Endpoint, Path, Params, SearchParams>) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [data, setData] = useState<ResponseBody | null>(null);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [loading, setLoading] = useState(!skip);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [error, setError] = useState<Error | null>(null);

    const stringifiedParams = stringify(params);
    // eslint-disable-next-line react-hooks/rules-of-hooks, react-hooks/exhaustive-deps
    const memoisedParams = useMemo(() => params, [stringifiedParams]);

    const stringifiedSearchParams = stringify(searchParams);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const memoisedSearchParams = useMemo(
      () => searchParams,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [stringifiedSearchParams],
    );

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const refetch = useCallback(async () => {
      if (skip) {
        return true;
      }
      setLoading(true);
      try {
        const { status, json } = await this.fetchWithCache(
          memoisedParams,
          memoisedSearchParams,
          stringifiedParams,
          stringifiedSearchParams,
        );
        if (status < 200 || status > 299) {
          if (typeof json === "string") {
            throw new Error(json);
          } else if (!json || typeof json !== "object") {
            throw new Error("Empty fetch response");
          } else {
            const error = json as Record<string, string>;
            throw new Error(
              error.error || error.message || error.reason || "Fetch error",
            );
          }
        }

        const result = this.options.responseSchema.parse(json);
        setData(result);
        return true;
      } catch (e) {
        const error = e instanceof Error ? e : new Error("API error", { cause: e });
        console.error(`API Error fetching ${this.options.endpoint}:`, error);
        setError(error);
        return false;
      } finally {
        setLoading(false);
      }
    }, [
      stringifiedParams,
      memoisedParams,
      stringifiedSearchParams,
      memoisedSearchParams,
      skip,
    ]);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      if (skip) {
        return;
      }

      if (pollIntervalMs) {
        const poller = new AdaptivePoller(refetch, {
          minInterval: pollIntervalMs,
          maxInterval: pollIntervalMs * 30,
        });
        poller.start();
        return () => poller.stop();
      }

      void refetch();
    }, [refetch, pollIntervalMs, skip]);

    return {
      data,
      loading,
      error,
      refetch,
    };
  }
}

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ZodType } from "zod/v4";
import { AdaptivePoller } from "./AdaptivePoller";

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

type ApiRouteOptions<Endpoint extends string, ResponseBody> = {
  endpoint: Endpoint;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  access: "all" | "logged-in" | "admins";
  responseSchema: ZodType<ResponseBody>;
};

type UseApiRouteProps<
  Endpoint extends string,
  Path extends AbsolutePath<Endpoint>,
  Params extends BracketParams<Path>,
> = {
  // TODO Strongly type params
  params: Record<Params, string>;
  pollIntervalMs?: number;
  skip?: boolean;
};

export class ApiRoute<
  Endpoint extends string,
  Path extends AbsolutePath<Endpoint>,
  Params extends BracketParams<Path>,
  ResponseBody,
> {
  constructor(private readonly options: ApiRouteOptions<Endpoint, ResponseBody>) {}

  fetch(params: Record<Params, string>) {
    let endpoint: string = this.options.endpoint;
    for (const param in params) {
      const value = params[param];
      endpoint = endpoint.replaceAll(`[${param}]`, value);
    }
    return fetch(endpoint, {
      method: this.options.method,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  use({
    params,
    pollIntervalMs,
    skip = false,
  }: UseApiRouteProps<Endpoint, Path, Params>) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [data, setData] = useState<ResponseBody | null>(null);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [loading, setLoading] = useState(!skip);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [error, setError] = useState<Error | null>(null);

    // eslint-disable-next-line react-hooks/rules-of-hooks, react-hooks/exhaustive-deps
    const memoisedParams = useMemo(() => params, [JSON.stringify(params)]);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const refetch = useCallback(async () => {
      if (skip) {
        return true;
      }
      setLoading(true);
      try {
        const response = await this.fetch(memoisedParams);

        const rawResult = await response.json();
        if (response.status < 200 || response.status > 299) {
          throw new Error(
            typeof rawResult === "string"
              ? rawResult
              : rawResult.error || rawResult.message || rawResult.reason,
          );
        }

        const result = this.options.responseSchema.parse(rawResult);
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
    }, [memoisedParams, skip]);

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

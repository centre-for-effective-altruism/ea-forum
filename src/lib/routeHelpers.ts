import { isAnyTest } from "./environment";

export const getSiteUrl = () => {
  if (isAnyTest()) {
    return "http://localhost:3000";
  }
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  return url[url.length - 1] === "/" ? url : url + "/";
};

export const combineUrls = (baseUrl: string, path: string) =>
  path ? baseUrl.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "") : baseUrl;

export const appendQueryParams = (url: string, params: Record<string, string>) => {
  // We add a dummy base for relative URLs - this is removed later before returning
  const isRelative = !/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url);
  const base = isRelative ? "http://dummy" : undefined;
  const parsed = new URL(url, base);
  for (const [key, value] of Object.entries(params)) {
    parsed.searchParams.set(key, value);
  }
  return isRelative
    ? parsed.pathname + parsed.search + parsed.hash
    : parsed.toString();
};

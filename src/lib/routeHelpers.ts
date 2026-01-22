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

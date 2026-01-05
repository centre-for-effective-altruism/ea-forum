export const getSiteUrl = () => {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  return url[url.length - 1] === "/" ? url : url + "/";
};

export const combineUrls = (baseUrl: string, path: string) =>
  path ? baseUrl.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "") : baseUrl;

export const getSiteUrl = () => process.env.NEXT_PUBLIC_SITE_URL;

export const combineUrls = (baseUrl: string, path: string) =>
  path
    ? baseUrl.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '')
    : baseUrl;

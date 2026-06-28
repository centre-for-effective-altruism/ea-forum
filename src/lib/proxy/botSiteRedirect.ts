import type { NextRequest } from "next/server";
import { isBotSite } from "../environment";

const userAgentConfigs: { path: RegExp; userAgents: RegExp[] }[] = [
  {
    path: /\/all[Pp]osts\?.*/,
    userAgents: [
      /bingbot\//,
      /YandexRenderResourcesBot\//,
      /YandexBot\//,
      /SemrushBot/,
      /Googlebot\//,
      /MegaIndex\.ru\//,
    ],
  },
  {
    path: /.*/,
    userAgents: [
      /scalaj-http\//,
      /python-requests\//,
      /python-httpx\//,
      /okhttp\//,
      /axios\//,
      /PostmanRuntime\//,
      /WordPress\/.*;/,
      /Go-http-client\//,
      /scrapy\//,
    ],
  },
];

/**
 * Given a particular request, determine if we should redirect to the bot site.
 * If so, returns the absolute URL to redirect to, otherwise null.
 */
export const getBotSiteRedirectUrl = (request: NextRequest): string | null => {
  const botSiteHost = process.env.BOT_SITE_REDIRECT_HOST;
  const userAgent = request.headers.get("user-agent");
  if (isBotSite || !botSiteHost || !userAgent) {
    return null;
  }

  for (const { path, userAgents } of userAgentConfigs) {
    if (path.test(request.url)) {
      if (userAgents.some((regex) => regex.test(userAgent))) {
        const url = new URL(request.url);
        url.host = botSiteHost;
        return url.toString();
      }
    }
  }

  return null;
};

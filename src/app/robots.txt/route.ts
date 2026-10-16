import { isBotSite } from "@/lib/environment";
import { combineUrls, getSiteUrl } from "@/lib/routeHelpers";

const buildMainRobotsTxt = () => `
User-agent: SeekportBot
Disallow: /

User-agent: *
Disallow: /allPosts?*
Disallow: /out?*
Disallow: /graphiql
Disallow: /debug
Disallow: /admin
Disallow: /compare
Disallow: /emailToken
Disallow: /revisions/*
Disallow: /*?commentId=*
Crawl-Delay: 2

Sitemap: ${combineUrls(getSiteUrl(), "/sitemap.xml")}
`;

const buildBotsRobotsTxt = () => `
# This site is a read-only mirror intended for bots and agents.
# The canonical site is https://forum.effectivealtruism.org/

User-agent: *
Allow: /
Crawl-Delay: 1

Sitemap: ${combineUrls(getSiteUrl(), "/sitemap.xml")}
`;

export const GET = () => {
  const robotsTxt = isBotSite ? buildBotsRobotsTxt() : buildMainRobotsTxt();
  return new Response(robotsTxt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};

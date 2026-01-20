import { load as cheerioLoad } from "cheerio";
import { URL } from "url";
import { getSiteUrl } from "./routeHelpers";
import { db } from "./db";

const domainWhitelist = {
  onsiteDomains: [
    "forum.effectivealtruism.org",
    "forum-staging.effectivealtruism.org",
    "localhost:3000",
  ],
  mirrorDomains: ["ea.greaterwrong.com"],
};

/**
 * Returns true if two domains are either the same, or differ only by addition
 * or removal of a "www."
 */
const isSameDomainModuloWWW = (a: string, b: string) =>
  a === b || "www." + a === b || a === "www." + b;

const classifyHost = (host: string): "onsite" | "offsite" | "mirrorOfUs" => {
  for (const domain of domainWhitelist.onsiteDomains) {
    if (isSameDomainModuloWWW(host, domain)) {
      return "onsite";
    }
  }
  for (const domain of domainWhitelist.mirrorDomains) {
    if (isSameDomainModuloWWW(host, domain)) {
      return "mirrorOfUs";
    }
  }
  return "offsite";
};

const extractLinks = (html: string): string[] => {
  const $ = cheerioLoad(html, null, false);
  const targets: string[] = [];
  $("a").each((_i, anchorTag) => {
    const href = $(anchorTag)?.attr("href");
    if (href) {
      targets.push(href);
    }
  });
  return targets;
};

/**
 * Match a URL route pattern with actual URL and extract parameters.
 * Returns a record of param names to values, or null if it doesn't match.
 */
const matchRoute = (
  /** Route pattern like "/posts/:id/:slug" */
  route: string,
  /** Actual URL to match against */
  url: string,
): Record<string, string> | null => {
  const routeParts = route.split("/").filter(Boolean);
  const urlParts = url.split("/").filter(Boolean);
  if (routeParts.length !== urlParts.length) {
    return null;
  }
  const params: Record<string, string> = {};
  for (let i = 0; i < routeParts.length; i++) {
    const routePart = routeParts[i];
    const urlPart = urlParts[i];
    if (routePart.startsWith(":")) {
      const paramName = routePart.slice(1);
      params[paramName] = decodeURIComponent(urlPart);
    } else if (routePart !== urlPart) {
      return null;
    }
  }
  return params;
};

const getPostPingbackById = async (
  { postId }: Record<string, string>,
  search?: URLSearchParams,
) => {
  const commentId = search?.get("commentId");
  return commentId
    ? { collectionName: "Comments", documentId: commentId }
    : { collectionName: "Posts", documentId: postId };
};

const getPostPingbackBySlug = async (
  { slug }: Record<string, string>,
  search?: URLSearchParams,
) => {
  const commentId = search?.get("commentId");
  if (commentId) {
    return { collectionName: "Comments", documentId: commentId };
  }
  const post = await db.query.posts.findFirst({
    columns: {
      _id: true,
    },
    where: {
      slug,
    },
  });
  return post?._id ? { collectionName: "Posts", documentId: post._id } : null;
};

const getUserPingbackBySlug = async ({ slug }: Record<string, string>) => {
  const user = await db.query.users.findFirst({
    columns: {
      _id: true,
    },
    where: {
      slug,
    },
  });
  return user?._id ? { collectionName: "Users", documentId: user._id } : null;
};

const getUserPingbackBySearchPostId = async (
  _: Record<string, string>,
  search: URLSearchParams,
) => {
  const postId = search.get("postId");
  return postId ? { collectionName: "Posts", documentId: postId } : null;
};

const getTagPingbackBySlug = async ({ slug }: Record<string, string>) => {
  const tag = await db.query.tags.findFirst({
    columns: {
      _id: true,
    },
    where: {
      slug,
    },
  });
  return tag?._id ? { collectionName: "Tags", documentId: tag._id } : null;
};

type PingbackRouteCallback = (
  params: Record<string, string>,
  search: URLSearchParams,
) => Promise<{ collectionName: string; documentId: string } | null>;

const pingbackRoutes: Record<string, PingbackRouteCallback> = {
  "/posts/:postId": getPostPingbackById,
  "/posts/slug/:slug": getPostPingbackBySlug,
  "/posts/:postId/:slug": getPostPingbackById,
  "/events/:postId": getPostPingbackById,
  "/events/:postId/:slug": getPostPingbackById,
  "/g/:groupId/p/:postId": getPostPingbackById,
  "/collaborateOnPost": getUserPingbackBySearchPostId,
  "/s/:sequenceId/p/:postId": getPostPingbackById,
  "/users/:slug": getUserPingbackBySlug,
  "/topics/:slug": getTagPingbackBySlug,
  "/topics/:slug/discussion": getTagPingbackBySlug,
  "/about": () => getPostPingbackById({ postId: process.env.START_HERE_POST_ID }),
  "/intro": () => getPostPingbackById({ postId: process.env.INTRO_POST_ID }),
  "/contact": () => getPostPingbackById({ postId: process.env.CONTACT_POST_ID }),
};

type PingbackExclusion = {
  collectionName: string;
  documentId: string;
};

/**
 * Given an HTML document, extract the links from it and convert them to a set
 * of pingbacks, formatted as a dictionary from collection name -> array of
 * document IDs.
 *   html: The document to extract links from
 *   exclusions: An array of documents (as
 *     {collectionName,documentId}) to exclude. Used for excluding self-links.
 * Return a record from collection names to arrays of documents ids in those
 * collections.
 */
export const htmlToPingbacks = async (
  html: string,
  exclusions?: PingbackExclusion[],
): Promise<Record<string, string[]>> => {
  const links = extractLinks(html);

  // Collection name => array of distinct referenced document IDs in that
  // Collection, in order of first appearance.
  const pingbacks: Record<string, string[]> = {};

  for (const link of links) {
    try {
      // HACK: Parse URLs as though relative to example.com because they have to
      // be the builtin URL parser needs them to be relative to something with a
      // domain, and the domain doesn't matter at all except in whether or not
      // it's in the domain whitelist (which it will only be if it's overridden
      // by an absolute link).
      const linkTargetAbsolute = new URL(link, getSiteUrl());
      const hostType = classifyHost(linkTargetAbsolute.host);
      if (hostType === "onsite" || hostType === "mirrorOfUs") {
        for (const route in pingbackRoutes) {
          const params = matchRoute(route, linkTargetAbsolute.pathname);
          if (params) {
            const callback = pingbackRoutes[route];
            const pingback = await callback(params, linkTargetAbsolute.searchParams);
            if (pingback) {
              if (
                exclusions?.find(
                  (exclusion) =>
                    exclusion.documentId === pingback.documentId &&
                    exclusion.collectionName === pingback.collectionName,
                )
              ) {
                break;
              }
              if (!(pingback.collectionName in pingbacks)) {
                pingbacks[pingback.collectionName] = [];
              }
              if (
                !pingbacks[pingback.collectionName].includes(pingback.documentId)
              ) {
                pingbacks[pingback.collectionName].push(pingback.documentId);
              }
            }
            break;
          }
        }
      }
    } catch (err) {
      console.error(`Failed to create pingback for link '${link}':`, err);
    }
  }

  return pingbacks;
};

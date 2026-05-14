import type { NotificationDocument } from "./notifications/notificationHelpers";
import type { CurrentUser } from "./users/currentUser";
import type { Comment, Post } from "./schema";
import uniq from "lodash/uniq";
import difference from "lodash/difference";
import intersection from "lodash/intersection";
import { createNotifications } from "./notifications/notificationMutations";
import { dataToHtml } from "./conversionUtils/dataToHtml";
import { htmlToTextDefault } from "./utils/htmlToText";
import { userCanMention } from "./users/userHelpers";
import { load as cheerioLoad } from "cheerio";
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
 * Collection name => array of distinct referenced document IDs in that
 * collection, in order of first appearance.
 */
export type Pingbacks = Record<string, string[]>;

type DocumentWithPingbacks = {
  _id: string;
  pingbacks: Pingbacks | null;
  draft?: boolean;
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
): Promise<Pingbacks> => {
  const links = extractLinks(html);
  const pingbacks: Pingbacks = {};

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

const getPingbacksToSend = (
  collectionName: string,
  document: DocumentWithPingbacks,
  oldDocument?: DocumentWithPingbacks,
): Pingbacks => {
  const pingbacksFromDocuments = (pingbackCollection: string) => {
    const newDocPingbacks = document.pingbacks?.[pingbackCollection] ?? [];
    const oldDocPingbacks = oldDocument?.pingbacks?.[pingbackCollection] ?? [];
    const newPingbacks = difference(newDocPingbacks, oldDocPingbacks);

    if (collectionName !== "Posts" && collectionName !== "Comments") {
      return newPingbacks;
    }

    const doc = document as Post | Comment;
    const oldDoc = oldDocument as Post | Comment | undefined;

    if (doc.draft) {
      if (collectionName === "Posts") {
        const post = doc as Post;
        return intersection(newPingbacks, post.shareWithUsers);
      }
      return [];
    }

    // This currently does not handle multiple moves between draft and published.
    if (oldDoc && oldDoc.draft && !document.draft) {
      let alreadyNotifiedUsers: string[] = [];
      if (collectionName === "Posts") {
        alreadyNotifiedUsers = intersection(
          oldDocPingbacks,
          (oldDoc as Post).shareWithUsers,
        );
      }

      return difference(newDocPingbacks, alreadyNotifiedUsers);
    }

    return newPingbacks;
  };

  const result: Pingbacks = {};
  for (const pingbackCollection in document.pingbacks) {
    result[pingbackCollection] = pingbacksFromDocuments(pingbackCollection);
  }
  return result;
};

const countAllPingbacks = (pingbacks: Pingbacks): number => {
  let count = 0;
  for (const pingbackCollection in pingbacks) {
    count += pingbacks[pingbackCollection].length;
  }
  return count;
};

const filterUserIds = (userIds: string[], filteredUserIds: string[]): string[] =>
  difference(uniq(userIds), filteredUserIds);

const COMMENT_EXCERPT_LENGTH = 40;

const getCommentExcerpt = async (comment: Pick<Comment, "contents">) => {
  const originalContents = comment.contents?.originalContents;
  if (!originalContents) {
    return "";
  }
  const html = await dataToHtml(originalContents.data, originalContents.type);
  return htmlToTextDefault(html).slice(0, COMMENT_EXCERPT_LENGTH);
};

const collectionNotificationTypes = {
  Posts: "post",
  Comments: "comment",
  Users: "user",
  Messages: "message",
  TagRels: "tagRel",
  Localgroups: "localgroup",
  DialogueChecks: "dialogueCheck",
  DialogueMatchPreferences: "dialogueMatchPreference",
} satisfies Record<string, NotificationDocument>;

export const notifyUsersOfPingbackMentions = async (
  currentUser: CurrentUser,
  collectionName: keyof typeof collectionNotificationTypes,
  document: DocumentWithPingbacks,
  /**
   * When `oldDocument` is not provided we assume this is a new document and
   * notify for all relevant pingbacks. If `oldDocument` is provided then we
   * assume this is an edit, and we only notify for relevant pingbacks if it
   * is a new pingback present in `document`, but not in `oldDocument`.
   */
  oldDocument?: DocumentWithPingbacks,
) => {
  const notificationType = collectionNotificationTypes[collectionName];
  if (!notificationType) {
    return;
  }

  if (
    !userCanMention(currentUser, countAllPingbacks(document.pingbacks ?? {})).result
  ) {
    return;
  }

  const promises: Promise<unknown>[] = [];

  const pingbacksToSend = getPingbacksToSend(collectionName, document, oldDocument);

  const filteredUserIds: string[] = [currentUser._id];

  if (pingbacksToSend.Users) {
    const userIds = filterUserIds(pingbacksToSend.Users, filteredUserIds);
    filteredUserIds.push(...userIds);
    promises.push(
      createNotifications({
        notificationType: "newMention",
        userIds,
        documentId: document._id,
        documentType: notificationType,
      }),
    );
  }

  if (pingbacksToSend.Posts?.length) {
    const posts = await db.query.posts.findMany({
      columns: {
        _id: true,
        title: true,
        userId: true,
        coauthorUserIds: true,
      },
      where: {
        _id: { in: pingbacksToSend.Posts },
      },
    });
    for (const post of posts) {
      const userIds = filterUserIds(
        [post.userId, ...post.coauthorUserIds],
        filteredUserIds,
      );
      filteredUserIds.push(...userIds);
      promises.push(
        createNotifications({
          notificationType: "newPingback",
          userIds,
          documentId: document._id,
          documentType: notificationType,
          extraData: {
            pingbackType: "post",
            pingbackDocumentId: post._id,
            pingbackDocumentExcerpt: post.title,
          },
        }),
      );
    }
  }

  if (pingbacksToSend.Comments?.length) {
    const comments = await db.query.comments.findMany({
      columns: {
        _id: true,
        userId: true,
        parentCommentId: true,
        shortform: true,
        contents: true,
      },
      where: {
        _id: { in: pingbacksToSend.Comments },
      },
    });
    for (const comment of comments) {
      const isQuickTake = comment.shortform && !comment.parentCommentId;
      const userIds = filterUserIds([comment.userId], filteredUserIds);
      filteredUserIds.push(...userIds);
      promises.push(
        createNotifications({
          notificationType: "newPingback",
          userIds,
          documentId: document._id,
          documentType: notificationType,
          extraData: {
            pingbackType: isQuickTake ? "quick take" : "comment",
            pingbackDocumentId: comment._id,
            pingbackDocumentExcerpt: await getCommentExcerpt(comment),
          },
        }),
      );
    }
  }

  return await Promise.all(promises);
};

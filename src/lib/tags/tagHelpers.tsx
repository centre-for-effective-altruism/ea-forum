import { combineUrls, getSiteUrl } from "../routeHelpers";
import type { PostTag } from "./tagQueries";
import qs from "querystring";

export const tagGetPageUrl = ({
  tag,
  hash,
  isAbsolute,
  ...urlSearchParams
}: {
  tag: { slug: string };
  hash?: string;
  isAbsolute?: string;
  tab?: string;
  from?: string;
}) => {
  const search = qs.stringify(urlSearchParams);
  const searchSuffix = search ? `?${search}` : "";
  const hashSuffix = hash ? `#${hash}` : "";
  const url = `/topics/${tag.slug}`;
  const urlWithSuffixes = `${url}${searchSuffix}${hashSuffix}`;
  return isAbsolute ? combineUrls(getSiteUrl(), urlWithSuffixes) : urlWithSuffixes;
};

/**
 * Sort tags in order of: core-ness, score, then name (alphabetical)
 */
export const stableSortTags = (tags: PostTag[]): PostTag[] => {
  return [...tags].sort((a, b) => {
    if (a.core !== b.core) {
      return a.core ? -1 : 1;
    }

    if (a.baseScore !== b.baseScore) {
      return (b.baseScore || 0) - (a.baseScore || 0);
    }

    return a.name.localeCompare(b.name);
  });
};

export const tagGetUrl = ({
  tag,
  isAbsolute,
  hash,
  ...urlSearchParams
}: {
  tag: { slug: string };
  isAbsolute?: boolean;
  hash?: string;
  from?: string;
  tab?: string;
}) => {
  const search = qs.stringify(urlSearchParams);
  const searchSuffix = search ? `?${search}` : "";
  const hashSuffix = hash ? `#${hash}` : "";
  const url = `/topics/${tag.slug}`;
  const urlWithSuffixes = `${url}${searchSuffix}${hashSuffix}`;
  return isAbsolute ? combineUrls(getSiteUrl(), urlWithSuffixes) : urlWithSuffixes;
};

export const tagGetDiscussionUrl = (tag: { slug: string }, isAbsolute = false) => {
  const suffix = `/topics/${tag.slug}/discussion`;
  return isAbsolute ? combineUrls(getSiteUrl(), suffix) : suffix;
};

export const tagGetSubforumUrl = (tag: { slug: string }, isAbsolute = false) =>
  tagGetUrl({ tag, tab: "posts", isAbsolute });

export type TagCommentType = "SUBFORUM" | "DISCUSSION";

export const tagGetCommentLink = ({
  tagSlug,
  commentId,
  tagCommentType = "DISCUSSION",
  isAbsolute = false,
}: {
  tagSlug: string;
  commentId?: string | null;
  tagCommentType: TagCommentType;
  isAbsolute?: boolean;
}): string => {
  const base =
    tagCommentType === "DISCUSSION"
      ? tagGetDiscussionUrl({ slug: tagSlug }, isAbsolute)
      : tagGetSubforumUrl({ slug: tagSlug }, isAbsolute);
  return commentId
    ? `${base}${base.includes("?") ? "&" : "?"}commentId=${commentId}`
    : base;
};

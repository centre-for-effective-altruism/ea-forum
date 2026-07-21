import type { PostTag } from "./tagQueries";
import { combineUrls, getSiteUrl } from "../routeHelpers";
import qs from "querystring";

export const tagGetPageUrl = ({
  tag,
  hash,
  isAbsolute,
  ...urlSearchParams
}: {
  tag: { slug: string };
  hash?: string;
  isAbsolute?: boolean;
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

export const tagGetHistoryUrl = (props: {
  tag: { slug: string };
  hash?: string;
  isAbsolute?: boolean;
  tab?: string;
  from?: string;
}) => combineUrls(tagGetPageUrl(props), "/history");

export const tagGetDiscussionUrl = (props: {
  tag: { slug: string };
  hash?: string;
  isAbsolute?: boolean;
  tab?: string;
  from?: string;
}) => combineUrls(tagGetPageUrl(props), "/discussion");

/**
 * Sort tags in order of: core-ness, score, then name (alphabetical)
 */
export const stableSortTags = (tags: PostTag[]): PostTag[] => {
  return [...tags].sort((a, b) => {
    if (a.core !== b.core) {
      return a.core ? -1 : 1;
    }
    if (a.tagRel.baseScore !== b.tagRel.baseScore) {
      return (b.tagRel.baseScore || 0) - (a.tagRel.baseScore || 0);
    }
    return a.name.localeCompare(b.name);
  });
};

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
      ? tagGetDiscussionUrl({ tag: { slug: tagSlug }, isAbsolute })
      : tagGetPageUrl({ tag: { slug: tagSlug }, isAbsolute });
  return commentId
    ? `${base}${base.includes("?") ? "&" : "?"}commentId=${commentId}`
    : base;
};

import { z } from "zod/v4";
import type { PostListItem } from "./postLists";
import type { JsonRecord } from "../typeHelpers";
import type { Post } from "../schema";
import { getSiteUrl } from "../routeHelpers";
import { getCloudinaryCloudName } from "@/lib/cloudinary/cloudinaryHelpers";
import { htmlToTextDefault } from "../utils/htmlToText";

export const postsListViewSchema = z.object({
  view: z.enum(["frontpage", "sticky"]),
  offset: z.int().gte(0).optional(),
  limit: z.int().gt(0),
  excludeTagId: z.string().optional(),
  onlyTagId: z.string().optional(),
});

export type PostsListView = z.infer<typeof postsListViewSchema>;

export const postGetPageUrl = ({
  post,
  sequenceId,
  isAbsolute,
}: {
  post: Pick<Post, "_id" | "slug"> & Partial<Pick<Post, "isEvent" | "groupId">>;
  isAbsolute?: boolean;
  sequenceId?: string;
}) => {
  const prefix = isAbsolute ? getSiteUrl().slice(0, -1) : "";
  if (sequenceId) {
    return `${prefix}/s/${sequenceId}/p/${post._id}`;
  } else if (post.isEvent) {
    return `${prefix}/events/${post._id}/${post.slug}`;
  } else if (post.groupId) {
    return `${prefix}/g/${post.groupId}/p/${post._id}/`;
  }
  return `${prefix}/posts/${post._id}/${post.slug}`;
};

export const postGetCommentsUrl: typeof postGetPageUrl = (...args) =>
  postGetPageUrl(...args) + "#comments";

export type GoogleLocation = {
  address_components: {
    types: string;
    long_name: string;
  }[];
};

export const getEventLocation = ({
  onlineEvent,
  googleLocation,
}: {
  onlineEvent: boolean;
  googleLocation: unknown;
}) => {
  if (onlineEvent) {
    return "Online";
  }
  if (googleLocation) {
    const location = googleLocation as GoogleLocation;
    const locationTypePreferenceOrdering = ["locality", "political", "country"];
    for (const locationType of locationTypePreferenceOrdering) {
      for (const addressComponent of location.address_components) {
        if (addressComponent.types.indexOf(locationType) >= 0) {
          return addressComponent.long_name;
        }
      }
    }
    return null;
  }
  return "Online";
};

export const getPostReadTimeMinutes = (
  readTimeMinutesOverride: number | null,
  wordCount: number | null,
) => {
  if (typeof readTimeMinutesOverride === "number") {
    return Math.max(1, Math.round(readTimeMinutesOverride));
  }
  if (wordCount) {
    return Math.max(1, Math.round(wordCount / 250));
  }
  return 1;
};

const getSocialImagePreviewPrefix = () => {
  const cloudName = getCloudinaryCloudName();
  return `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,ar_1.91,g_auto/`;
};

export type PostWithSocialPreview = Pick<
  PostListItem,
  "isEvent" | "eventImageId" | "socialPreview" | "socialPreviewImageAutoUrl"
>;

export const getPostSocialImageUrl = (post: PostWithSocialPreview) => {
  const manualId =
    post.isEvent && post.eventImageId
      ? post.eventImageId
      : (post.socialPreview as JsonRecord)?.imageId;
  if (manualId) {
    return getSocialImagePreviewPrefix() + manualId;
  }
  return post.socialPreviewImageAutoUrl ?? null;
};

export const getPostPlaintextDescription = (post: PostListItem): string | null => {
  const highlightHtml = post.customHtmlHighlight || post.contents?.htmlHighlight;
  if (!highlightHtml) {
    return null;
  }
  return htmlToTextDefault(highlightHtml) || null;
};

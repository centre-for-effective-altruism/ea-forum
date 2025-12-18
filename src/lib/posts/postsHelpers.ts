import type { Json, JsonRecord } from "tradukisto";
import { getSiteUrl } from "../routeHelpers";
import { IFrontpagePostsList } from "./postQueries.schemas";
import { getCloudinaryCloudName } from "../cloudinaryHelpers";

export const postStatuses = {
  STATUS_PENDING: 1, // Unused
  STATUS_APPROVED: 2,
  STATUS_REJECTED: 3,
  STATUS_SPAM: 4,
  STATUS_DELETED: 5,
};

export const postGetPageUrl = ({
  post,
  sequenceId,
  isAbsolute,
}: {
  post: {
    _id: string;
    slug: string;
    isEvent?: boolean;
    groupId?: string | null;
  };
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
  googleLocation?: Json | null;
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

export const getPostReadTime = (
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
  IFrontpagePostsList,
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

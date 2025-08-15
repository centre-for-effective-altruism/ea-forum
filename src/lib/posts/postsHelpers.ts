import type { Json } from "tradukisto";
import { getSiteUrl } from "../routeHelpers";
import { IFrontpagePostsList } from "./postQueries.queries";
import { getCloudinaryCloudName } from "../cloudinaryHelpers";

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

type PostWithWordCount = Pick<
  IFrontpagePostsList,
  "readTimeMinutesOverride" | "wordCount"
>;

export const getPostReadTime = (post: PostWithWordCount) => {
  if (typeof post.readTimeMinutesOverride === "number") {
    return Math.max(1, Math.round(post.readTimeMinutesOverride));
  }
  if (post.wordCount) {
    return Math.max(1, Math.round(post.wordCount / 250));
  }
  return 1;
};

const getSocialImagePreviewPrefix = () => {
  const cloudName = getCloudinaryCloudName();
  return `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,ar_1.91,g_auto/`;
};

type PostWithSocialPreview = Pick<
  IFrontpagePostsList,
  "isEvent" | "eventImageId" | "socialPreview" | "socialPreviewImageAutoUrl"
>;

export const getPostSocialImageUrl = (post: PostWithSocialPreview) => {
  const manualId =
    post.isEvent && post.eventImageId
      ? post.eventImageId
      : "SocialPreview/gegjp59jisldzazzk1cj";
  //: post.socialPreview?.imageId;
  if (manualId) {
    return getSocialImagePreviewPrefix() + manualId;
  }
  return post.socialPreviewImageAutoUrl ?? null;
};

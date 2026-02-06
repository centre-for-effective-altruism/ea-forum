import { z } from "zod/v4";
import type { CurrentUser } from "../users/currentUser";
import type { PostDisplay } from "./postQueries";
import type { PostListItem } from "./postLists";
import type { JsonRecord } from "../typeHelpers";
import type { Post } from "../schema";
import { getSiteUrl } from "../routeHelpers";
import { getCloudinaryCloudName } from "@/lib/cloudinary/cloudinaryHelpers";
import { htmlToTextDefault } from "../utils/htmlToText";
import { userCanDo, userIsInGroup } from "../users/userHelpers";

export const postStatuses = {
  STATUS_PENDING: 1, // Unused
  STATUS_APPROVED: 2,
  STATUS_REJECTED: 3,
  STATUS_SPAM: 4,
  STATUS_DELETED: 5,
};

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

type SharablePost = Pick<
  PostListItem,
  "coauthors" | "sharingSettings" | "currentUserIsShared" | "currentUserUsedLinkKey"
>;

export const userIsSharedOnPost = (
  currentUser: CurrentUser | null,
  post: SharablePost,
): boolean => {
  if (!currentUser) {
    return false;
  }

  // Shared as a coauthor? Always give access
  const coauthorUserIds = post.coauthors?.map(({ _id }) => _id) ?? [];
  if (coauthorUserIds.indexOf(currentUser._id) >= 0) {
    return true;
  }

  // Explicitly shared?
  if (post.currentUserIsShared) {
    return (
      !post.sharingSettings ||
      post.sharingSettings.explicitlySharedUsersCan !== "none"
    );
  }

  // If not individually shared with this user, still counts if shared if
  // (1) link sharing is enabled and (2) the user's ID is in
  // linkSharingKeyUsedBy.
  return !!(
    post.sharingSettings?.anyoneWithLinkCan &&
    post.sharingSettings.anyoneWithLinkCan !== "none" &&
    post.currentUserUsedLinkKey
  );
};

/**
 * Whether the user can make updates to the post document (including both the
 * main post body and most other post fields)
 */
export const canUserEditPostMetadata = (
  currentUser: CurrentUser | null,
  post: PostDisplay | PostListItem,
): boolean => {
  if (!currentUser) {
    return false;
  }

  const organizerIds = post.group?.organizerIds;
  if (organizerIds?.some((id) => id === currentUser?._id)) {
    return true;
  }
  if (post.user?._id === currentUser._id) {
    return true;
  }
  if (userCanDo(currentUser, "posts.edit.all")) {
    return true;
  }
  if (post.coauthors?.some((user) => user._id === currentUser._id)) {
    return true;
  }

  if (
    userIsSharedOnPost(currentUser, post) &&
    post.sharingSettings?.anyoneWithLinkCan === "edit"
  ) {
    return true;
  }

  if (
    post.currentUserIsShared &&
    post.sharingSettings?.explicitlySharedUsersCan === "edit"
  ) {
    return true;
  }

  return false;
};

export const userCanSuggestPostForCurated = (
  user: CurrentUser | null,
  post: Pick<Post, "frontpageDate" | "curatedDate">,
) => {
  if (!post.frontpageDate || post.curatedDate) {
    return false;
  }
  return (
    userCanDo(user, "posts.moderate.all") ||
    userIsInGroup(user, "canSuggestCuration")
  );
};

export const canUserArchivePost = (
  user: CurrentUser | null,
  post: PostDisplay | PostListItem,
) => {
  if (!user) {
    return false;
  }
  if (userCanDo(user, "posts.remove.all")) {
    return true;
  }
  const organizerIds = post.group?.organizerIds;
  const isPostGroupOrganizer = organizerIds?.some((id) => id === user?._id);
  return (post.user?._id === user._id || isPostGroupOrganizer) && !!post.draft;
};

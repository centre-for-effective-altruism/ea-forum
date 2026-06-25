import { z } from "zod/v4";
import type { CurrentUser } from "../users/currentUser";
import type { PostDisplay } from "./postQueries";
import type { PostListItem } from "./postLists";
import type { JsonRecord } from "../typeHelpers";
import type { Post } from "../schema";
import { getSiteUrl } from "../routeHelpers";
import { POST_COMMENTS_ANCHOR } from "./postAnchors";
import { getCloudinaryCloudName } from "@/lib/cloudinary/cloudinaryHelpers";
import { htmlToTextDefault } from "../utils/htmlToText";
import { userCanDo, userGetProfileUrl, userIsInGroup } from "../users/userHelpers";
import { filterSettingsSchema } from "../filterSettings";
import { tagGetUrl } from "../tags/tagHelpers";

export const postStatuses = {
  STATUS_PENDING: 1, // Unused
  STATUS_APPROVED: 2,
  STATUS_REJECTED: 3,
  STATUS_SPAM: 4,
  STATUS_DELETED: 5,
};

export const postsListViewSchema = z.object({
  view: z.enum(["frontpage", "sticky", "orgUpdates"]),
  offset: z.int().gte(0).optional(),
  limit: z.int().gt(0),
  excludeTagId: z.union([z.string(), z.array(z.string()).max(10)]).optional(),
  onlyTagId: z.string().optional(),
  filterSettings: filterSettingsSchema.optional(),
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
  postGetPageUrl(...args) + `#${POST_COMMENTS_ANCHOR}`;

export const postGetEditUrl = (
  postId: string,
  isAbsolute = false,
  linkSharingKey?: string,
  version?: string,
): string => {
  const prefix = isAbsolute ? getSiteUrl().slice(0, -1) : "";
  let url = `${prefix}/editPost?postId=${postId}`;
  if (linkSharingKey) {
    url += `&key=${linkSharingKey}`;
  }
  if (version) {
    url += `&version=${version}`;
  }
  return url;
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

type SocialImageOptions = {
  width?: number;
  dpr?: number;
};

export const getSocialImagePreviewPrefix = (options?: SocialImageOptions) => {
  const cloudName = getCloudinaryCloudName();
  const width = options?.width ? `,w_${options.width}` : "";
  const dpr = options?.dpr ? `,dpr_${options.dpr}` : "";
  return `https://res.cloudinary.com/${cloudName}/image/upload/q_auto,f_auto,c_lfill,ar_1.91,g_auto${width}${dpr}/`;
};

export type PostWithSocialPreview = Pick<
  PostListItem,
  "isEvent" | "eventImageId" | "socialPreview" | "socialPreviewImageAutoUrl"
>;

export const getPostSocialImageUrl = (
  post: PostWithSocialPreview,
  options?: SocialImageOptions,
) => {
  const manualId =
    post.isEvent && post.eventImageId
      ? post.eventImageId
      : (post.socialPreview as JsonRecord)?.imageId;
  if (manualId) {
    return getSocialImagePreviewPrefix(options) + manualId;
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

export const getPostCollaborateUrl = (
  postId: string,
  isAbsolute = false,
  linkSharingKey?: string,
) => {
  const prefix = isAbsolute ? getSiteUrl().slice(0, -1) : "";
  if (linkSharingKey) {
    return `${prefix}/collaborateOnPost?postId=${postId}&key=${linkSharingKey}`;
  }
  return `${prefix}/collaborateOnPost?postId=${postId}`;
};

/**
 * Whether the user can make updates to the post document (including both the
 * main post body and most other post fields)
 */
export const userCanEditPostMetadata = (
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

export const userCanModeratePost = (
  user: CurrentUser | null,
  post?: Pick<Post, "userId" | "frontpageDate"> | null,
): boolean => {
  if (userCanDo(user, "posts.moderate.all")) {
    return true;
  }
  if (!user || !post) {
    return false;
  }
  if (
    userCanDo(user, "posts.moderate.own.personal") &&
    user._id === post.userId &&
    !post.frontpageDate
  ) {
    return true;
  }
  return !!(userCanDo(user, "posts.moderate.own") && user._id === post.userId);
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

export const userCanArchivePost = (
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

export const postHasNewUnreadComments = (post: PostListItem) => {
  const { readStatus, lastCommentedAt } = post;
  if (
    !readStatus?.[0]?.isRead ||
    !readStatus?.[0]?.lastUpdated ||
    !lastCommentedAt
  ) {
    return false;
  }
  const lastVisitedDate = new Date(readStatus[0].lastUpdated);
  const lastCommentedDate = new Date(lastCommentedAt);
  return lastVisitedDate < lastCommentedDate;
};

const POST_DESCRIPTION_EXCLUSIONS: RegExp[] = [
  /cross-? ?posted/i,
  /epistemic status/i,
  /acknowledgements/i,
];

/** Get a og:description-appropriate description for a post */
export const getPostDescription = (post: PostDisplay): string | undefined => {
  const socialPreview = post.socialPreview as Record<string, unknown> | undefined;
  if (socialPreview?.text && typeof socialPreview.text === "string") {
    return socialPreview.text;
  }

  const longDescriptionHtml = post.customHighlightHtml || post.contents?.html;
  if (longDescriptionHtml) {
    const longDescription = htmlToTextDefault(longDescriptionHtml);

    // Concatenate the first few paragraphs together up to some reasonable length
    const plaintextPars = longDescription
      // Paragraphs in the plaintext description are separated by double-newlines
      .split(/\n\n/)
      // Get rid of opening text ('epistemic status' or 'crossposted from' etc)
      .filter((par) => !POST_DESCRIPTION_EXCLUSIONS.some((re) => re.test(par)));

    if (!plaintextPars.length) {
      return undefined;
    }

    // Concatenate paragraphs together with a delimiter, until they reach an
    // acceptable length (target is 100-200 characters). This will return a
    // longer description if one of the first couple of paragraphs is longer
    // than 200.
    let firstFewPars = plaintextPars[0];
    for (const par of plaintextPars.slice(1)) {
      const concat = `${firstFewPars} • ${par}`;
      // If we're really short, we need more
      if (firstFewPars.length < 40) {
        firstFewPars = concat;
        continue;
      }
      // Otherwise, if we have room for the whole next paragraph, concatenate it
      if (concat.length < 150) {
        firstFewPars = concat;
        continue;
      }
      // If we're here, we know we have enough and couldn't fit the last
      // paragraph, so we should stop
      break;
    }
    if (firstFewPars.length > 148) {
      return firstFewPars.slice(0, 149).trim() + "…";
    }
    return firstFewPars + " …";
  }
  if (post.shortform) {
    const userText = post.user ? `by EA Forum user ${post.user.displayName}` : "";
    return `A collection of shorter posts ${userText}`;
  }
  return undefined;
};

export const postGetStructuredData = (
  post: PostDisplay,
  description = getPostDescription(post) ?? null,
): JsonRecord => {
  const url = postGetPageUrl({ post, isAbsolute: true });
  return {
    "@context": "http://schema.org",
    "@type": "DiscussionForumPosting",
    url: url,
    text: post.contents?.html ?? description,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    headline: post.title,
    description,
    datePublished: post.postedAt,
    about: (post.tags ?? [])
      .filter((tag) => !!tag.description)
      .map((tag) => ({
        "@type": "Thing",
        name: tag.name,
        url: tagGetUrl({ tag, isAbsolute: true }),
        description: tag.description,
      })),
    author: [
      ...(post.user
        ? [
            {
              "@type": "Person",
              name: post.user.displayName,
              url: userGetProfileUrl({ user: post.user, isAbsolute: true }),
            },
          ]
        : []),
      ...(post.coauthors ?? []).map((author) => ({
        "@type": "Person",
        name: author.displayName,
        url: userGetProfileUrl({ user: author, isAbsolute: true }),
      })),
    ],
  };
};

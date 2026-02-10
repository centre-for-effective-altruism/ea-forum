import urlJoin from "url-join";
import type { CurrentUser } from "./currentUser";
import type { Localgroup, Post, User } from "../schema";
import { allUserGroupsByName } from "./userGroups";
import uniq from "lodash/uniq";
import flatten from "lodash/flatten";
import intersection from "lodash/intersection";

export const MINIMUM_APPROVAL_KARMA = 5;

export const userGetProfileUrl = ({
  user,
  from,
}: {
  user: { slug: string | null };
  from?: string;
}) => {
  const url = user.slug ? `/users/${user.slug}` : "#";
  return from ? `${url}?from=${from}` : url;
};

export const userGetStatsUrl = ({ slug }: Pick<CurrentUser, "slug">) =>
  `/users/${slug}/stats`;

type CareerStageValue =
  | "highSchool"
  | "associateDegree"
  | "undergradDegree"
  | "professionalDegree"
  | "graduateDegree"
  | "doctoralDegree"
  | "otherDegree"
  | "earlyCareer"
  | "midCareer"
  | "lateCareer"
  | "seekingWork"
  | "retired";

type EAGCareerStage =
  | "Student (high school)"
  | "Pursuing an associates degree"
  | "Pursuing an undergraduate degree"
  | "Pursuing a professional degree"
  | "Pursuing a graduate degree (e.g. Masters)"
  | "Pursuing a doctoral degree (e.g. PhD)"
  | "Pursuing other degree/diploma"
  | "Working (0-5 years of experience)"
  | "Working (6-15 years of experience)"
  | "Working (15+ years of experience)"
  | "Not employed, but looking"
  | "Retired";

export type CareerStage = {
  value: CareerStageValue;
  label: string;
  icon: "School" | "Work";
  eagLabel: EAGCareerStage;
};

export const userCareerStages: CareerStage[] = [
  {
    value: "highSchool",
    label: "In high school",
    icon: "School",
    eagLabel: "Student (high school)",
  },
  {
    value: "associateDegree",
    label: "Pursuing an associate's degree",
    icon: "School",
    eagLabel: "Pursuing an associates degree",
  },
  {
    value: "undergradDegree",
    label: "Pursuing an undergraduate degree",
    icon: "School",
    eagLabel: "Pursuing an undergraduate degree",
  },
  {
    value: "professionalDegree",
    label: "Pursuing a professional degree",
    icon: "School",
    eagLabel: "Pursuing a professional degree",
  },
  {
    value: "graduateDegree",
    label: "Pursuing a graduate degree (e.g. Master's)",
    icon: "School",
    eagLabel: "Pursuing a graduate degree (e.g. Masters)",
  },
  {
    value: "doctoralDegree",
    label: "Pursuing a doctoral degree (e.g. PhD)",
    icon: "School",
    eagLabel: "Pursuing a doctoral degree (e.g. PhD)",
  },
  {
    value: "otherDegree",
    label: "Pursuing other degree/diploma",
    icon: "School",
    eagLabel: "Pursuing other degree/diploma",
  },
  {
    value: "earlyCareer",
    label: "Working (0-5 years)",
    icon: "Work",
    eagLabel: "Working (0-5 years of experience)",
  },
  {
    value: "midCareer",
    label: "Working (6-15 years)",
    icon: "Work",
    eagLabel: "Working (6-15 years of experience)",
  },
  {
    value: "lateCareer",
    label: "Working (15+ years)",
    icon: "Work",
    eagLabel: "Working (6-15 years of experience)",
  },
  {
    value: "seekingWork",
    label: "Seeking work",
    icon: "Work",
    eagLabel: "Not employed, but looking",
  },
  {
    value: "retired",
    label: "Retired",
    icon: "Work",
    eagLabel: "Retired",
  },
];

export type SocialMediaSiteName =
  | "linkedin"
  | "facebook"
  | "bluesky"
  | "twitter"
  | "github"
  | "website";

const socalMediaProfileFields = {
  linkedinProfileURL: "linkedin.com/in/",
  facebookProfileURL: "facebook.com/",
  blueskyProfileURL: "bsky.app/profile/",
  twitterProfileURL: "twitter.com/",
  githubProfileURL: "github.com/",
};

type SocialMediaProfileField = keyof typeof socalMediaProfileFields;

const profileFieldToSocialMediaHref = (
  field: SocialMediaProfileField,
  userUrl: string,
) => urlJoin("https://" + socalMediaProfileFields[field], userUrl);

export const socialMediaSiteNameToHref = (
  siteName: SocialMediaSiteName | "website",
  userUrl: string,
) =>
  siteName === "website"
    ? `https://${userUrl}`
    : profileFieldToSocialMediaHref(`${siteName}ProfileURL`, userUrl);

type UserDisplayNameInfo = {
  username: string | null;
  fullName?: string | null;
  displayName: string | null;
};

/**
 * Get a user's username (unique, no special characters or spaces)
 */
export const getUserName = (
  user: { username: string | null } | null,
): string | null => user?.username || null;

/**
 * Get a user's display name (not unique, can take special characters and spaces)
 */
export const userGetDisplayName = (user: UserDisplayNameInfo | null): string =>
  user ? ((user.displayName || user.username) ?? "") : "";

/**
 * Check if a user is an admin
 */
export const userIsAdmin = <T extends Partial<User>>(
  user: T | null,
): user is T & { isAdmin: true } => user?.isAdmin ?? false;

type UserPermissions = Pick<User, "groups" | "banned" | "isAdmin">;

/**
 * Get a list of a user's groups
 */
export const userGetGroups = (user: UserPermissions | null): string[] => {
  if (!user) {
    return ["guests"];
  }
  if (user.banned && new Date(user.banned) > new Date()) {
    return ["guests"];
  }

  let userGroups = ["members"];
  if (user.groups) {
    userGroups = userGroups.concat(user.groups);
  }
  if (user.isAdmin) {
    userGroups.push("admins");
  }
  return userGroups;
};

/**
 * Check if a user is in the given group
 */
export const userIsInGroup = (user: UserPermissions | null, group: string) =>
  userGetGroups(user).indexOf(group) >= 0;

/**
 * Get a list of all the actions a user can perform
 */
export const userGetActions = (user: UserPermissions | null): string[] => {
  const groups = userGetGroups(user);
  if (!groups.includes("guests")) {
    // Always give everybody permission for guests actions, too
    groups.push("guests");
  }
  const groupActions = groups.map((groupName) => {
    // note: make sure groupName corresponds to an actual group
    const group = allUserGroupsByName[groupName];
    return group && group.actions;
  });
  return uniq(flatten(groupActions));
};

/**
 * Check if a user can perform at least one of the specified actions
 */
export const userCanDo = (
  user: UserPermissions | null,
  actionOrActions: string | string[],
): boolean => {
  const authorizedActions = userGetActions(user);
  const actions = Array.isArray(actionOrActions)
    ? actionOrActions
    : [actionOrActions];
  return userIsAdmin(user) || intersection(authorizedActions, actions).length > 0;
};

type HasUserIdType = { userId: string | null };
type HasUserType = { user?: { _id: string } | null };

type OwnableDocument = HasUserIdType | HasUserType | User;

/**
 * Check if a user owns a document
 */
export const userOwns = (
  user: CurrentUser | null,
  document: OwnableDocument,
): boolean => {
  if (!user) {
    return false;
  }
  if (!document) {
    return false;
  }

  // Document has a userId - it's a post, comment, tag, etc.
  if ("userId" in document) {
    return user._id === (document as HasUserIdType).userId;
  }
  if ("user" in document) {
    return user._id === document.user?._id;
  }

  // Document is a user - check for _id or slug equality
  const documentUser = document as User;
  const idsExistAndMatch =
    !!user._id && !!documentUser._id && user._id === documentUser._id;
  const slugsExistAndMatch =
    !!user.slug && !!documentUser.slug && user.slug === documentUser.slug;
  return idsExistAndMatch || slugsExistAndMatch;
};

/**
 * Whether or not the given user is an organizer for the post's group
 * Returned promise resolves to true if the post has a group and the user is
 * an organizer for that group
 */
export const userIsPostGroupOrganizer = async (
  user: CurrentUser | null,
  post: (Post & { group: Localgroup | null }) | null,
): Promise<boolean> => {
  const group = post?.group;
  return !!user && !!group && group.organizerIds.some((id) => id === user._id);
};

/**
 * True if the user is a coauthor of this post (returns false for the main author).
 */
export const userIsPostCoauthor = (
  user: Pick<User, "_id"> | null,
  post: Pick<Post, "coauthorUserIds"> | null,
): boolean => !!user && !!post && post.coauthorUserIds.indexOf(user._id) >= 0;

/**
 * True if the user is either the main author or a coauthor of the post.
 */
export const userIsPostAuthor = (
  user: Pick<User, "_id"> | null,
  post: Pick<Post, "userId" | "coauthorUserIds"> | null,
): boolean =>
  !!user && !!post && (user._id === post.userId || userIsPostCoauthor(user, post));

/**
 * Count a user as "new" if they have low karma or joined less than a week ago
 */
export const userIsNew = (user: Pick<User, "createdAt" | "karma">): boolean => {
  const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
  const karmaThreshold = 50;
  const userCreatedAt = new Date(user.createdAt);
  const userKarma = user.karma;
  const userBelowKarmaThreshold = karmaThreshold && userKarma < karmaThreshold;
  return (
    userBelowKarmaThreshold ||
    userCreatedAt.getTime() > new Date().getTime() - oneWeekInMs
  );
};

/**
 * Return the current user's location, as a latitude-longitude pair, plus the
 * boolean field `known`. If `known` is false, the lat/lng are invalid placeholders.
 * If the user is logged in, we try to return the location specified in their
 * account settings.
 */
export const userGetLocation = (
  user: Pick<User, "mongoLocation"> | null,
): {
  lat: number;
  lng: number;
  known: boolean;
} => {
  const currentUserLat = user?.mongoLocation?.coordinates[1];
  const currentUserLng = user?.mongoLocation?.coordinates[0];
  return currentUserLat && currentUserLng
    ? { lat: currentUserLat, lng: currentUserLng, known: true }
    : { lat: 37.871853, lng: -122.258423, known: false };
};

export const userIsPodcaster = (user: UserPermissions | null): boolean =>
  userIsInGroup(user, "podcasters");

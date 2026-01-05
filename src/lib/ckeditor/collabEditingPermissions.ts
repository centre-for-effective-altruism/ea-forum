import type { Localgroup, Post } from "@/lib/schema";
import type { CurrentUser } from "../users/currentUser";
import { constantTimeCompare } from "../utils/constantTimeCompare";
import {
  userCanDo,
  userIsPostCoauthor,
  userIsPostGroupOrganizer,
  userOwns,
} from "../users/userHelpers";

export type CollaborativeEditingFormType = "new" | "edit";

export const isCollaborativeEditingFormType = (
  ty: string,
): ty is CollaborativeEditingFormType => ty === "new" || ty === "edit";

export type CollaborativeEditingAccessLevel = "none" | "read" | "comment" | "edit";

const strongerAccessLevel = (
  a: CollaborativeEditingAccessLevel | null | undefined,
  b: CollaborativeEditingAccessLevel | null | undefined,
): CollaborativeEditingAccessLevel => {
  if (a === "edit" || b === "edit") {
    return "edit";
  }
  if (a === "comment" || b === "comment") {
    return "comment";
  }
  if (a === "read" || b === "read") {
    return "read";
  }
  if (a) {
    return a;
  }
  if (b) {
    return b;
  }
  return "none";
};

type PostSharingSettings = {
  explicitlySharedUsersCan?: CollaborativeEditingAccessLevel;
  anyoneWithLinkCan?: CollaborativeEditingAccessLevel;
};

export const permissionsLevelToCkEditorRole = (
  access: CollaborativeEditingAccessLevel,
): string => {
  switch (access) {
    case "edit":
      return "writer";
    case "comment":
      return "commentator";
    case "read":
      return "reader";
    case "none":
      return "";
  }
};

// ForumMagnum FIXME: There's a lot of redundancy between this function and
// canUserEditPostMetadata in lib/collections/posts/helpers.ts, but they are
// tricky to merge because of the `useAdminPowers` flag and because
// `canUserEditPostMetadata` can't check for group-organizer status because it
// isn't async. This function is used for controlling access to the body
// (getting a ckEditor token).
export const getCollaborativeEditorAccess = async ({
  formType,
  post,
  user,
  linkSharingKey,
  useAdminPowers,
}: {
  formType: "new" | "edit";
  post: (Post & { group: Localgroup | null }) | null;
  user: CurrentUser | null;
  linkSharingKey: string | null;
  /**
   * If true and the user is a moderator/admin, take their admin powers into
   * account. If false, return permissions as they would be given no moderator
   * powers.
   */
  useAdminPowers: boolean;
}): Promise<CollaborativeEditingAccessLevel> => {
  if (formType === "new" && user && !post) {
    return "edit";
  }
  if (!post) {
    return "none";
  }

  const canEditAsAdmin = useAdminPowers && userCanDo(user, "posts.edit.all");
  const canEdit =
    userOwns(user, post) ||
    canEditAsAdmin ||
    (await userIsPostGroupOrganizer(user, post)) ||
    userIsPostCoauthor(user, post);

  let accessLevel: CollaborativeEditingAccessLevel = "none";
  if (canEdit) {
    accessLevel = strongerAccessLevel(accessLevel, "edit");
  }

  const sharingSettings = post.sharingSettings as PostSharingSettings | null;
  if (user && post.shareWithUsers.includes(user._id)) {
    accessLevel = strongerAccessLevel(
      accessLevel,
      sharingSettings?.explicitlySharedUsersCan,
    );
  }

  const canonicalLinkSharingKey = post.linkSharingKey;
  const keysMatch =
    !!canonicalLinkSharingKey &&
    !!linkSharingKey &&
    constantTimeCompare({
      correctValue: canonicalLinkSharingKey,
      unknownValue: linkSharingKey,
    });
  if (keysMatch) {
    accessLevel = strongerAccessLevel(
      accessLevel,
      sharingSettings?.anyoneWithLinkCan,
    );
  }

  return accessLevel;
};

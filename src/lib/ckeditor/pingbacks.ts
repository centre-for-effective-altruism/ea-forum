import type { CurrentUser } from "../users/currentUser";
import type { EditorDocument } from "./editorHelpers";
import { userMentionQuery, userMentionValue } from "./mentionsConfig";

const isMention = (href: string) => {
  try {
    const url = new URL(href);
    return url.searchParams.get(userMentionQuery) === userMentionValue;
  } catch {
    return false;
  }
};

export const countMentions = (document: EditorDocument): number => {
  // These CkEditor internal types are pretty janky...
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countMentionsRecursively = (node: any) => {
    let mentions = 0;
    for (const child of node.getChildren()) {
      if (child.is("text")) {
        const href = child.getAttribute("linkHref");
        if (!href) {
          continue;
        }
        mentions += isMention(href) ? 1 : 0;
      } else if (child.is("element")) {
        mentions += countMentionsRecursively(child);
      }
    }
    return mentions;
  };
  const rootElement = document.getRoot();
  return countMentionsRecursively(rootElement);
};

const youCanStillPost =
  "This will not prevent you from posting, but the mentioned users won't be notified.";

export const canMention = ({
  currentUser,
  mentionsCount,
  karmaThreshold = 1,
  mentionsLimit = 10,
}: {
  currentUser: CurrentUser;
  mentionsCount: number;
  karmaThreshold?: number;
  mentionsLimit?: number;
}): { result: boolean; reason?: string } => {
  if (currentUser.isAdmin) {
    return { result: true };
  }

  if ((currentUser.karma || 0) < karmaThreshold && mentionsCount > 0) {
    return {
      result: false,
      reason: `You must have at least ${karmaThreshold} karma to mention users. ${youCanStillPost}`,
    };
  }

  if (mentionsCount > mentionsLimit) {
    return {
      result: false,
      reason: `You can notify ${mentionsLimit} users at most in a single post. ${youCanStillPost}`,
    };
  }

  if (currentUser.conversationsDisabled || currentUser.mentionsDisabled) {
    return {
      result: false,
      reason: `Ability to mention users has been disabled for this account. ${youCanStillPost}`,
    };
  }

  return { result: true };
};

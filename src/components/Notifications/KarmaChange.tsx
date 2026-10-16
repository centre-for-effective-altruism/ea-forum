import type { ReactNode } from "react";
import { captureException } from "@sentry/nextjs";
import type {
  CommentKarmaChange,
  PostKarmaChange,
  ReactionChange,
  RevisionsKarmaChange,
} from "@/lib/users/karmaChangesTypes";
import { getReactionByName, ReactionOption } from "@/lib/votes/reactions";
import { commentGetPageUrlFromIds } from "@/lib/comments/commentHelpers";
import { userGetProfileUrl } from "@/lib/users/userHelpers";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { tagGetPageUrl } from "@/lib/tags/tagHelpers";
import StarIcon from "@heroicons/react/24/solid/StarIcon";
import LazyCommentsTooltip from "../LazyCommentsTooltip";
import LazyPostsTooltip from "../LazyPostsTooltip";
import Tooltip from "../Tooltip";
import Link from "../Link";
import Type from "../Type";

const logAndCaptureError = (error: Error) => {
  console.error(error);
  captureException(error);
};

type ReactionUsers =
  | {
      reaction: ReactionOption;
      users: { displayName: string; slug: string }[];
      userCount?: never;
    }
  | {
      reaction: ReactionOption;
      users?: never;
      userCount: number;
    };

type AddedReactions = {
  reaction: ReactionOption;
  users: ReactNode;
  tooltip?: string;
};

const formatUsers = (users: { displayName: string; slug: string }[], max = 3) => {
  const userLinks = users.map((user) => (
    <Link key={user.slug} href={userGetProfileUrl({ user: { slug: user.slug } })}>
      {user.displayName}
    </Link>
  ));
  if (userLinks.length < 2) {
    return userLinks[0];
  }

  // Join all but the last with commas, and add "and" before the last user or
  // "and X more" if over 'max'
  const displayedUserLinks = userLinks.slice(0, Math.min(max, userLinks.length - 1));
  const lastUserOrCount =
    userLinks.length <= max
      ? userLinks[userLinks.length - 1]
      : `${userLinks.length - max} more`;
  return (
    <>
      {displayedUserLinks.reduce<ReactNode[] | null>(
        (acc, elem) => (acc === null ? [elem] : [...acc, ", ", elem]),
        null,
      )}
      {" and "}
      {lastUserOrCount}
    </>
  );
};

const getAddedReactions = (
  addedReactions?: Record<string, ReactionChange>,
): AddedReactions[] => {
  if (!addedReactions) {
    return [];
  }
  const reactions: Record<string, ReactionUsers> = {};
  for (const reactionType in addedReactions) {
    const change = addedReactions[reactionType];
    if (typeof change === "number") {
      const reaction = getReactionByName(reactionType);
      if (reaction) {
        reactions[reactionType] = {
          reaction,
          userCount: change,
        };
      } else {
        console.error("Invalid private reactionType:", reactionType);
      }
    } else {
      const reaction = getReactionByName(reactionType);
      if (reaction) {
        reactions[reactionType] = {
          reaction,
          users: change.map(({ displayName, slug }) => ({ displayName, slug })),
        };
      } else {
        console.error("Invalid public reactionType:", reactionType);
      }
    }
  }
  return Object.values(reactions).map(({ reaction, users = [], userCount }) => {
    return {
      reaction,
      users: users.length
        ? formatUsers(users)
        : `${userCount} ${userCount === 1 ? "person" : "people"}`,
      tooltip:
        users.length > 1
          ? `${users
              .slice(0, -1)
              .map(({ displayName }) => displayName)
              .join(", ")} and ${users[users.length - 1].displayName}`
          : users[0]?.displayName,
    };
  });
};

export default function KarmaChange({
  postKarmaChange,
  commentKarmaChange,
  tagRevisionKarmaChange,
}: Readonly<{
  postKarmaChange?: PostKarmaChange;
  commentKarmaChange?: CommentKarmaChange;
  tagRevisionKarmaChange?: RevisionsKarmaChange;
}>) {
  let karmaChange: number;
  let reactions: AddedReactions[] = [];
  let display: ReactNode;

  if (postKarmaChange) {
    const postUrl = postGetPageUrl({
      post: { _id: postKarmaChange.postId, slug: postKarmaChange.slug },
    });
    karmaChange = postKarmaChange.scoreChange;
    reactions = getAddedReactions(postKarmaChange.addedReacts);
    display = (
      <LazyPostsTooltip postId={postKarmaChange.postId} As="span">
        <Link href={postUrl}>{postKarmaChange.title}</Link>
      </LazyPostsTooltip>
    );
  } else if (commentKarmaChange) {
    karmaChange = commentKarmaChange.scoreChange;
    reactions = getAddedReactions(commentKarmaChange.addedReacts);
    const { postId, postSlug, postTitle, tagSlug, tagName } = commentKarmaChange;
    if (postId && postSlug && postTitle) {
      display = (
        <>
          <LazyCommentsTooltip As="span" commentId={commentKarmaChange.commentId}>
            <Link href={commentGetPageUrlFromIds(commentKarmaChange)}>comment</Link>
          </LazyCommentsTooltip>{" "}
          on{" "}
          <LazyPostsTooltip postId={commentKarmaChange.postId} As="span">
            <Link href={postGetPageUrl({ post: { _id: postId, slug: postSlug } })}>
              {postTitle}
            </Link>
          </LazyPostsTooltip>
        </>
      );
    } else if (tagSlug) {
      display = (
        <>
          <Link href={commentGetPageUrlFromIds(commentKarmaChange)}>comment</Link> on{" "}
          <Link href={tagGetPageUrl({ tag: { slug: tagSlug } })}>{tagName}</Link>
        </>
      );
    } else {
      const details = JSON.stringify(commentKarmaChange);
      logAndCaptureError(new Error(`Invalid commentKarmaChange ${details}`));
      return null;
    }
  } else if (tagRevisionKarmaChange) {
    if (!tagRevisionKarmaChange.tagName || !tagRevisionKarmaChange.tagSlug) {
      const details = JSON.stringify(tagRevisionKarmaChange);
      logAndCaptureError(new Error(`Invalid tagRevisionKarmaChange ${details}`));
      return null;
    }
    karmaChange = tagRevisionKarmaChange.scoreChange;
    display = (
      <Link href={tagGetPageUrl({ tag: { slug: tagRevisionKarmaChange.tagSlug } })}>
        {tagRevisionKarmaChange.tagName}
      </Link>
    );
  } else {
    const details = JSON.stringify({
      postKarmaChange,
      commentKarmaChange,
      tagRevisionKarmaChange,
    });
    logAndCaptureError(new Error(`Invalid karma change: ${details}`));
    return null;
  }

  return (
    <AnalyticsContext pageSubSectionContext="karmaChange">
      {karmaChange !== 0 && (
        <div className="flex gap-3 items-start pl-1">
          <StarIcon className="text-karma-star w-5 min-w-5 mt-1" />
          <Type className="text-gray-600 [&_a]:text-gray-1000 [&>*]:inline grow">
            <span className="mr-[6px]">
              {karmaChange < 0 ? String(karmaChange) : `+${karmaChange}`} karma
            </span>
            {display}
          </Type>
        </div>
      )}
      {reactions.map(({ reaction, users, tooltip }, i) => (
        <div key={i} className="flex gap-3 items-start pl-1">
          <Tooltip title={reaction.label}>
            <reaction.Component className="text-primary w-5 min-w-5 mt-1" />
          </Tooltip>
          <Type className="text-gray-600 [&_a]:text-gray-1000 [&>*]:inline grow">
            <Tooltip title={tooltip} placement="bottom">
              {users}
            </Tooltip>{" "}
            reacted to {commentKarmaChange && "your"} {display}
          </Type>
        </div>
      ))}
    </AnalyticsContext>
  );
}

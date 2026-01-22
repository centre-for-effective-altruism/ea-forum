import { useMemo, FC } from "react";
import type { RecentDiscussionPost } from "@/lib/recentDiscussions/fetchRecentDiscussions";
import { commentGetPageUrlFromIds } from "@/lib/comments/commentHelpers";
import { CommentsListProvider } from "@/components/Comments/useCommentsList";
import groupBy from "lodash/groupBy";
import RecentDiscussionsItem from "./RecentDiscussionsItem";
import CommentsList from "@/components/Comments/CommentsList";
import CommentItem from "@/components/Comments/CommentItem";

/**
 * This works differently to the other recent discussion items, and can in fact
 * render multiple items from a single post if there are replies to more than
 * one quick take from a single user.
 *
 * This `Inner` component assumes that:
 *  1) `comments` is a non-empty array, ]
 *  2) all of the comments have the same top level comment (which is the
 *     quick take being responded to)
 *  3) `comments[i].topLevelComment` is not null
 */
const QuickTakeCommentedInner: FC<{
  post: RecentDiscussionPost;
  comments: RecentDiscussionPost["comments"];
}> = ({ post, comments }) => {
  const quickTake = comments[0].topLevelComment!;
  return (
    <RecentDiscussionsItem
      icon="Comment"
      iconVariant="primary"
      user={comments[0].user}
      action="commented on"
      postTitleOverride={`${post.user?.displayName}'s quick take`}
      post={post}
      postUrlOverride={commentGetPageUrlFromIds({
        postId: post._id,
        postSlug: post.slug,
        commentId: quickTake._id,
      })}
      timestamp={comments[0].postedAt}
    >
      <CommentsListProvider comments={comments}>
        <CommentItem
          node={{ comment: quickTake, depth: 0, children: [], isLocal: false }}
          borderless
          className="mb-4"
        />
        <CommentsList />
      </CommentsListProvider>
    </RecentDiscussionsItem>
  );
};

export default function RecentDiscussionsQuickTakeCommented({
  post,
}: Readonly<{
  post: RecentDiscussionPost;
}>) {
  const threads = useMemo(
    () => Object.values(groupBy(post.comments, "topLevelCommentId")),
    [post.comments],
  );
  return (
    <>
      {threads.map((comments) => (
        <QuickTakeCommentedInner
          key={comments[0].topLevelCommentId}
          post={post}
          comments={comments}
        />
      ))}
    </>
  );
}

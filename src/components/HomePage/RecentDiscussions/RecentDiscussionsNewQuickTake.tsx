import type { RecentDiscussionComment } from "@/lib/recentDiscussions/fetchRecentDiscussions";
import { commentGetPageUrl } from "@/lib/comments/commentHelpers";
import { CommentsListProvider } from "@/components/Comments/useCommentsList";
import RecentDiscussionsItem from "./RecentDiscussionsItem";
import CommentsList from "@/components/Comments/CommentsList";

export default function RecentDiscussionsNewQuickTake({
  quickTake,
}: Readonly<{
  quickTake: RecentDiscussionComment;
}>) {
  if (!quickTake.post) {
    // Should never happen, but make the typechecker happy
    return null;
  }
  return (
    <RecentDiscussionsItem
      icon="Comment"
      iconVariant="grey"
      user={quickTake.user}
      action="posted a"
      postTitleOverride="Quick Take"
      postUrlOverride={commentGetPageUrl({ comment: quickTake })}
      post={quickTake.post}
      timestamp={quickTake.postedAt}
    >
      <CommentsListProvider comments={[quickTake]}>
        <CommentsList borderless />
      </CommentsListProvider>
    </RecentDiscussionsItem>
  );
}

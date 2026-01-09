"use client";

import type { RecentDiscussionPost } from "@/lib/recentDiscussions/fetchRecentDiscussions";
import { useRecentDiscussionThread } from "./useRecentDiscussionThread";
import RecentDiscussionsItem, {
  RecentDiscussionItemProps,
} from "./RecentDiscussionsItem";

const getItemProps = (post: RecentDiscussionPost): RecentDiscussionItemProps => {
  if (!post.comments?.length) {
    // It's a new event
    if (post.isEvent) {
      return {
        icon: "Event",
        iconVariant: "grey",
        user: post.user,
        action: "scheduled",
        post,
        timestamp: post.postedAt,
      };
    }

    // We're displaying the post as a new post
    return {
      icon: post.question ? "Question" : "Post",
      iconVariant: "grey",
      user: post.user,
      action: "posted",
      post,
      timestamp: post.postedAt,
    };
  }

  // We're displaying the new comments on the post
  return {
    icon: "Comment",
    iconVariant: "primary",
    user: post.comments[0].user,
    action: "commented on",
    post,
    timestamp: post.comments[0].postedAt,
  };
};

export default function RecentDiscussionsPostCommented({
  post,
}: {
  post: RecentDiscussionPost;
}) {
  const {
    isSkippable,
    // expandAllThreads,
    // nestedComments,
  } = useRecentDiscussionThread({
    post,
    comments: post.comments,
  });
  if (isSkippable) {
    return null;
  }
  return (
    <RecentDiscussionsItem {...getItemProps(post)}>
      <div>TODO</div>
    </RecentDiscussionsItem>
  );
}

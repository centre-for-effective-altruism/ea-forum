"use client";

import type { RecentDiscussionPost } from "@/lib/recentDiscussions/fetchRecentDiscussions";
import { useRecentDiscussionThread } from "./useRecentDiscussionThread";
import RecentDiscussionsItem, {
  RecentDiscussionItemProps,
} from "./RecentDiscussionsItem";
import {
  getPostReadTimeMinutes,
  postGetCommentsUrl,
  postGetPageUrl,
} from "@/lib/posts/postsHelpers";
import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import UsersName from "@/components/UsersName";
import TimeAgo from "@/components/TimeAgo";
import Score from "@/components/Score";
import Type from "@/components/Type";
import PostsTooltip from "@/components/PostsTooltip";
import LinkPostMessage from "@/components/PostsPage/LinkPostMessage";
import CommentItem from "@/components/Comments/CommentItem";
import PostBody from "@/components/ContentStyles/PostBody";
import Link from "@/components/Link";

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
    nestedComments,
  } = useRecentDiscussionThread({
    post,
    comments: post.comments,
  });
  if (isSkippable) {
    return null;
  }
  const { title, user, isEvent, commentCount, baseScore, voteCount } = post;
  const postLink = postGetPageUrl({ post });
  const commentsLink = postGetCommentsUrl({ post });
  const readTime = getPostReadTimeMinutes(
    post.readTimeMinutesOverride,
    post.contents?.wordCount ?? null,
  );
  return (
    <RecentDiscussionsItem {...getItemProps(post)}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 text-gray-600 pr-2">
          <Score
            baseScore={baseScore}
            voteCount={voteCount}
            orient="vertical"
            className="min-w-[33px]"
          />
          <div className="truncate grow">
            <Type style="postTitle" className="text-black truncate">
              <PostsTooltip As="span" post={post}>
                <Link
                  href={postLink}
                  className="visited:text-gray-700 hover:opacity-60"
                >
                  {title}
                </Link>
              </PostsTooltip>
            </Type>
            <Type style="bodySmall">
              <UsersName user={user} />
              {" · "}
              <TimeAgo
                As="span"
                textStyle="bodySmall"
                time={post.postedAt}
                includeAgo
              />
              {" · "}
              {readTime}m read
            </Type>
          </div>
          {!isEvent && (
            <Link
              href={commentsLink}
              className="flex items-center gap-1 hover:text-black"
            >
              <ChatBubbleLeftIcon className="w-[18px]" />
              <Type>{commentCount}</Type>
            </Link>
          )}
        </div>
        <LinkPostMessage post={post} />
        <PostBody html={post.contents?.htmlHighlight} />
        <Type style="bodyMedium">
          <Link href={postLink} className="text-primary hover:opacity-70">
            Continue reading
          </Link>
        </Type>
        {nestedComments.map((comment) => (
          <CommentItem key={comment.comment._id} node={comment} />
        ))}
      </div>
    </RecentDiscussionsItem>
  );
}

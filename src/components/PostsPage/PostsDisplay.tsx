import { notFound } from "next/navigation";
import { userGetProfileUrl } from "@/lib/users/userHelpers";
import { getPostReadTimeMinutes } from "@/lib/posts/postsHelpers";
import { formatShortDate } from "@/lib/timeUtils";
import { db } from "@/lib/db";
import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import ChevronDownIcon from "@heroicons/react/16/solid/ChevronDownIcon";
import ChevronUpIcon from "@heroicons/react/16/solid/ChevronUpIcon";
import UserProfileImage from "../UserProfileImage";
import UsersTooltip from "../UsersTooltip";
import PostBody from "../ContentStyles/PostBody";
import ReadProgress from "./ReadProgress";
import Type from "../Type";
import Link from "../Link";

export default async function PostDisplay({ postId }: { postId: string }) {
  const post = await db.query.posts.findFirst({
    where: {
      _id: postId,
    },
    with: {
      user: true,
      contents: true,
    },
  });
  if (!post) {
    notFound();
  }

  const readTimeMinutes = getPostReadTimeMinutes(
    post.readTimeMinutesOverride,
    post.contents?.wordCount ?? null,
  );

  return (
    <ReadProgress post={post} readTimeMinutes={readTimeMinutes}>
      <Type style="postsPageTitle" className="mb-10">
        {post.title}
      </Type>
      <div className="flex gap-3 mb-6">
        <UserProfileImage user={post.user} size={36} />
        <div>
          <Type style="bodyMedium">
            {post.user ? (
              <UsersTooltip user={post.user} As="span">
                <Link href={userGetProfileUrl(post.user)}>
                  {post.user.displayName}
                </Link>
              </UsersTooltip>
            ) : (
              "[Anonymous]"
            )}
          </Type>
          <Type style="bodyMedium" className="text-gray-600">
            {readTimeMinutes} min read
            {" · "}
            {formatShortDate(post.postedAt)}
          </Type>
        </div>
      </div>
      <div className="py-4 border-y border-(--color-posts-page-hr) text-gray-600 flex">
        <div className="flex items-center gap-4 grow">
          <div className="flex items-center gap-1">
            <ChevronDownIcon className="w-[20px]" />
            <Type style="bodyMedium" className="text-[16px]">
              {post.baseScore}
            </Type>
            <ChevronUpIcon className="w-[20px]" />
          </div>
          <Type style="bodyMedium" className="flex items-center gap-1">
            <ChatBubbleLeftIcon className="w-[22px]" />
            {post.commentCount}
          </Type>
        </div>
        <div className="flex gap-5">TODO: Buttons</div>
      </div>
      <div className="mt-6">TODO: Tags</div>
      <PostBody html={post.contents?.html ?? null} className="mt-10" />
    </ReadProgress>
  );
}

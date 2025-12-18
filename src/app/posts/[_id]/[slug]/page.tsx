import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPostReadTime } from "@/lib/posts/postsHelpers";
import { getCurrentUser } from "@/lib/requestHandler";
import { formatShortDate } from "@/lib/timeUtils";
import { userGetProfileUrl } from "@/lib/users/userHelpers";
import { db } from "@/lib/schema";
import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import ChevronDownIcon from "@heroicons/react/16/solid/ChevronDownIcon";
import ChevronUpIcon from "@heroicons/react/16/solid/ChevronUpIcon";
import UserProfileImage from "@/components/UserProfileImage";
import LazyCommentsSection from "@/components/Comments/LazyCommentsSection";
import LazyPostBody from "@/components/ContentStyles/LazyPostBody";
import UsersTooltip from "@/components/UsersTooltip";
import Type from "@/components/Type";
import Link from "@/components/Link";

export default async function PostsPage({
  params,
}: {
  params: Promise<{ _id: string }>;
}) {
  const [{ _id }, { currentUser }] = await Promise.all([params, getCurrentUser()]);

  const post = await db.query.posts.findFirst({
    where: {
      _id,
    },
    with: {
      user: true,
      contents: true,
    },
  });
  if (!post) {
    notFound();
  }

  const readTime = getPostReadTime(
    post.readTimeMinutesOverride,
    post.contents?.wordCount ?? null,
  );

  return (
    <div data-component="PostsPage">
      <div className="w-[698px] max-w-full mx-auto">
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
              {readTime} min read
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
        <Suspense
          fallback={
            <div className="mt-10 w-full flex flex-col gap-[1em]">
              <div className="w-full h-50 bg-gray-100 rounded" />
              <div className="w-full h-50 bg-gray-100 rounded" />
              <div className="w-full h-50 bg-gray-100 rounded" />
            </div>
          }
        >
          <LazyPostBody
            currentUser={currentUser}
            postId={post._id}
            className="mt-10"
          />
        </Suspense>
        <Type style="commentsHeader" className="mt-18 mb-6">
          Comments <span className="text-gray-600">{post.commentCount}</span>
        </Type>
        <Suspense
          fallback={
            <div className="mb-20 flex flex-col gap-4">
              <div className="w-full h-30 bg-gray-100 rounded" />
              <div className="w-full h-30 bg-gray-100 rounded" />
              <div className="w-full h-30 bg-gray-100 rounded" />
            </div>
          }
        >
          <LazyCommentsSection postId={post._id} className="mb-20" />
        </Suspense>
      </div>
      <div className="w-full bg-(--background) pt-15 pb-20">
        <div className="w-[698px] max-w-full mx-auto">
          {post.user && (
            <Type style="sectionTitleLarge" className="mb-2">
              More from {post.user.displayName}
            </Type>
          )}
          <Type style="sectionTitleLarge" className="mb-2">
            Curated and popular this week
          </Type>
          <Type style="sectionTitleLarge" className="mb-2">
            {/* TODO */}
            Recent opportunities in Cause prioritization
          </Type>
        </div>
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import { PostsRepo } from "@/lib/posts/postQueries.repo";
import { getPostReadTime } from "@/lib/posts/postsHelpers";
import { getCurrentUser } from "@/lib/requestHandler";
import { formatShortDate } from "@/lib/timeUtils";
import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import ChevronDownIcon from "@heroicons/react/16/solid/ChevronDownIcon";
import ChevronUpIcon from "@heroicons/react/16/solid/ChevronUpIcon";
import UserProfileImage from "@/components/UserProfileImage";
import CommentsSection from "@/components/Comments/CommentsSection";
import LazyPostBody from "@/components/ContentStyles/LazyPostBody";
import Type from "@/components/Type";
import { Suspense } from "react";

export default async function PostsPage({
  params,
}: {
  params: Promise<{ _id: string }>;
}) {
  const [{ _id }, { db, currentUser }] = await Promise.all([
    params,
    getCurrentUser(),
  ]);
  const post = await new PostsRepo(db).postById({
    postId: _id,
    currentUserId: currentUser?._id ?? null,
    currentUserIsAdmin: !!currentUser?.isAdmin,
  });

  if (!post) {
    notFound();
  }

  return (
    <div className="w-[698px] max-w-full mx-auto" data-component="PostsPage">
      <Type style="postsPageTitle" className="mb-10">
        {post.title}
      </Type>
      <div className="flex gap-3 mb-6">
        <UserProfileImage user={post.user} size={36} />
        <div>
          <Type style="bodyMedium">{post.user.displayName}</Type>
          <Type style="bodyMedium" className="text-gray-600">
            {getPostReadTime(post)} min read
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
      <CommentsSection postId={post._id} />
    </div>
  );
}

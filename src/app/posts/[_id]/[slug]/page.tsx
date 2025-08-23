import { PostsRepo } from "@/lib/posts/postQueries.repo";
import { getPostReadTime } from "@/lib/posts/postsHelpers";
import { getCurrentUser } from "@/lib/requestHandler";
import { formatShortDate } from "@/lib/timeUtils";
import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import ChevronDownIcon from "@heroicons/react/16/solid/ChevronDownIcon";
import ChevronUpIcon from "@heroicons/react/16/solid/ChevronUpIcon";
import UserProfileImage from "@/components/UserProfileImage";
import PostBody from "@/components/PostBody";
import Type from "@/components/Type";

export default async function PostsPage({
  params,
}: {
  params: Promise<{ _id: string }>;
}) {
  const { _id } = await params;
  const { db, currentUser } = await getCurrentUser();
  const postsRepo = new PostsRepo(db);
  const [post, postBody] = await Promise.all([
    postsRepo.postById({
      postId: _id,
      currentUserId: currentUser?._id ?? null,
      currentUserIsAdmin: !!currentUser?.isAdmin,
    }),
    postsRepo.postBodyById({
      postId: _id,
      currentUserId: currentUser?._id ?? null,
      currentUserIsAdmin: !!currentUser?.isAdmin,
    }),
  ]);

  if (!post || !postBody) {
    // TODO
    return null;
  }

  return (
    <div>
      <article className="px-2 w-[698px] max-w-full mx-auto mt-[78px]">
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
        <PostBody html={postBody.body} className="mt-10" />
      </article>
    </div>
  );
}

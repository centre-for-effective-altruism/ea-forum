import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchPostDisplay } from "@/lib/posts/postQueries";
import { getPostReadTimeMinutes } from "@/lib/posts/postsHelpers";
import { formatShortDate } from "@/lib/timeUtils";
import { PostDisplayProvider } from "./usePostDisplay";
import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import PostVoteButtons from "../Voting/PostVoteButtons";
import LinkPostMessage from "./LinkPostMessage";
import UserProfileImage from "../UserProfileImage";
import PostAudioToggle from "./PostAudioToggle";
import PostAudioPlayer from "./PostAudioPlayer";
import PostBody from "../ContentStyles/PostBody";
import PostBookmark from "./PostBookmark";
import PostTags from "../Tags/PostTags";
import ReadProgress from "./ReadProgress";
import UsersName from "../UsersName";
import Tooltip from "../Tooltip";
import Type from "../Type";
import Link from "../Link";

export default async function PostDisplay({ postId }: { postId: string }) {
  const currentUser = await getCurrentUser();
  const post = await fetchPostDisplay(currentUser?._id ?? null, postId);
  if (!post) {
    notFound();
  }

  const readTimeMinutes = getPostReadTimeMinutes(
    post.readTimeMinutesOverride,
    post.contents?.wordCount ?? null,
  );

  return (
    <PostDisplayProvider post={post}>
      <ReadProgress post={post} readTimeMinutes={readTimeMinutes}>
        <Type style="postsPageTitle" As="h1" className="mb-10">
          {post.title}
        </Type>
        <div className="flex gap-3 mb-6">
          <UserProfileImage user={post.user} size={36} />
          <div>
            <Type style="bodyMedium">
              <UsersName user={post.user} pageSectionContext="post_header" />
            </Type>
            <Type style="bodyMedium" className="text-gray-600">
              {readTimeMinutes} min read
              {" · "}
              {formatShortDate(post.postedAt)}
            </Type>
          </div>
        </div>
        <div className="py-4 border-y border-posts-page-hr text-gray-600 flex">
          <div className="flex items-center gap-4 grow">
            <PostVoteButtons post={post} />
            <Tooltip title={<Type style="bodySmall">Comments</Type>}>
              <Link href="#comments" className="hover:text-gray-1000">
                <Type style="bodyMedium" className="flex items-center gap-1">
                  <ChatBubbleLeftIcon className="w-[22px]" />
                  {post.commentCount}
                </Type>
              </Link>
            </Tooltip>
            <PostAudioToggle />
          </div>
          <div className="flex items-center gap-5">
            <PostBookmark />
          </div>
        </div>
        <PostTags post={post} className="mt-6" />
        <PostAudioPlayer className="mt-10" />
        <LinkPostMessage post={post} className="mt-10" />
        <PostBody html={post.contents?.html ?? ""} className="mt-10" />
      </ReadProgress>
    </PostDisplayProvider>
  );
}

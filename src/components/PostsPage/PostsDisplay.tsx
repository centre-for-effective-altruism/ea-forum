import { Fragment } from "react";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchPostDisplay } from "@/lib/posts/postQueries";
import { getPostReadTimeMinutes } from "@/lib/posts/postsHelpers";
import { htmlToTableOfContents } from "@/lib/revisions/htmlToTableOfContents";
import { formatShortDate } from "@/lib/timeUtils";
import { PostDisplayProvider } from "./usePostDisplay";
import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import PostVoteButtons from "../Voting/PostVoteButtons";
import PostTableOfContents from "./PostTableOfContents";
import PostTripleDotMenu from "./PostTripleDotMenu";
import MorePostsLikeThis from "./MorePostsLikeThis";
import UserProfileImage from "../UserProfileImage";
import LinkPostMessage from "./LinkPostMessage";
import PostAudioToggle from "./PostAudioToggle";
import PostAudioPlayer from "./PostAudioPlayer";
import PostBody from "../ContentStyles/PostBody";
import PostShareButton from "./PostShareButton";
import PostBookmark from "./PostBookmark";
import ReadProgress from "./ReadProgress";
import PostTags from "../Tags/PostTags";
import PostColumn from "./PostColumn";
import UsersName from "../UsersName";
import Tooltip from "../Tooltip";
import Type from "../Type";
import Link from "../Link";

export default async function PostDisplay({ postId }: { postId: string }) {
  const currentUser = await getCurrentUser();
  const post = await fetchPostDisplay(currentUser, postId);
  if (!post) {
    notFound();
  }

  const tableOfContents = htmlToTableOfContents(post.contents?.html);
  const bodyHtml = tableOfContents?.html || post.contents?.html || "";
  const readTimeMinutes = getPostReadTimeMinutes(
    post.readTimeMinutesOverride,
    post.contents?.wordCount ?? null,
  );

  return (
    <PostDisplayProvider post={post}>
      <ReadProgress post={post} readTimeMinutes={readTimeMinutes}>
        <PostColumn>
          <Type style="postsPageTitle" As="h1" className="mb-10" id="top">
            {post.title}
          </Type>
          <div className="flex gap-3 mb-6">
            <UserProfileImage user={post.user} size={36} />
            <div>
              <Type style="bodyMedium">
                <UsersName user={post.user} pageSectionContext="post_header" />
                {post.coauthors?.map((coauthor) => (
                  <Fragment key={coauthor._id}>
                    , <UsersName user={coauthor} pageSectionContext="post_header" />
                  </Fragment>
                ))}
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
              <PostVoteButtons />
              <Tooltip title={<Type style="bodySmall">Comments</Type>}>
                <Link href="#comments" className="hover:text-gray-1000">
                  <Type style="bodyMedium" className="flex items-center gap-1">
                    <ChatBubbleLeftIcon className="w-[22px]" />
                    {post.commentCount}
                  </Type>
                </Link>
              </Tooltip>
            </div>
            <div className="flex items-center gap-5">
              <PostAudioToggle />
              <PostBookmark />
              <PostShareButton post={post} />
              <PostTripleDotMenu post={post} orientation="horizontal" hideBookmark />
            </div>
          </div>
        </PostColumn>
        <PostColumn
          left={
            <PostTableOfContents
              title={post.title}
              contents={tableOfContents}
              commentCount={post.commentCount}
              className="sticky left-0 top-18 pl-8 pt-5"
            />
          }
        >
          <PostTags post={post} className="mt-6" />
          <PostAudioPlayer className="mt-10" />
          <LinkPostMessage post={post} className="mt-10" />
          <PostBody html={bodyHtml} className="my-10" />
          {!post.shortform && (
            <div className="py-4 border-t border-posts-page-hr text-gray-600 flex mb-6">
              <div className="grow">
                <PostVoteButtons />
              </div>
              <div className="flex items-center gap-5">
                <PostShareButton post={post} />
                <PostTripleDotMenu
                  post={post}
                  orientation="horizontal"
                  hideBookmark
                />
              </div>
            </div>
          )}
          <MorePostsLikeThis />
        </PostColumn>
      </ReadProgress>
    </PostDisplayProvider>
  );
}

import { Fragment, Suspense } from "react";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchPostDisplayCached } from "@/lib/posts/postQueries";
import { fetchSequenceById } from "@/lib/sequences/sequenceQueries";
import { htmlToTableOfContents } from "@/lib/revisions/htmlToTableOfContents";
import { formatThousands } from "@/lib/formatHelpers";
import { PostDisplayProvider } from "./usePostDisplay";
import { formatShortDate, formatLongDateWithTime } from "@/lib/timeUtils";
import {
  getPostReadTimeMinutes,
  postGetStructuredData,
} from "@/lib/posts/postsHelpers";
import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import LinkIcon from "@heroicons/react/20/solid/LinkIcon";
import PangramStatus, { classifyPangramScore } from "../PangramStatus";
import PostSequenceBottomNavigation from "./PostSequenceBottomNavigation";
import PostSequenceTopNavigation from "./PostSequenceTopNavigation";
import PostVoteButtons from "../Voting/PostVoteButtons";
import PostTableOfContents from "./PostTableOfContents";
import StackedUserAvatars from "../StackedUserAvatars";
import PostTripleDotMenu from "./PostTripleDotMenu";
import MorePostsLikeThis from "./MorePostsLikeThis";
import PostTranslations from "./PostTranslations";
import DigestPopup from "../Digest/DigestPopup";
import LinkPostMessage from "./LinkPostMessage";
import PostAudioToggle from "./PostAudioToggle";
import PostAudioPlayer from "./PostAudioPlayer";
import PostBody from "../ContentStyles/PostBody";
import PostShareButton from "./PostShareButton";
import StructuredData from "../StructuredData";
import PostPingbacks from "./PostPingbacks";
import PostBookmark from "./PostBookmark";
import ReadProgress from "./ReadProgress";
import PostTags from "../Tags/PostTags";
import PostColumn from "./PostColumn";
import UsersName from "../UsersName";
import Tooltip from "../Tooltip";
import Type from "../Type";
import Link from "../Link";

export default async function PostDisplay({
  postId,
  sequenceId,
}: {
  postId: string;
  sequenceId?: string;
}) {
  const currentUser = await getCurrentUser();
  const [post, sequence] = await Promise.all([
    fetchPostDisplayCached(currentUser, postId),
    sequenceId ? fetchSequenceById({ currentUser, sequenceId }) : null,
  ]);
  if (!post) {
    notFound();
  }

  const tableOfContents = htmlToTableOfContents(post.contents?.html);
  const bodyHtml = tableOfContents?.html || post.contents?.html || "";
  const wordCount = post.contents?.wordCount ?? null;
  const readTimeMinutes = getPostReadTimeMinutes(
    post.readTimeMinutesOverride,
    wordCount,
  );
  const pangramClassification =
    typeof post.contents?.pangramAiScore === "number"
      ? classifyPangramScore(post.contents.pangramAiScore)
      : null;

  const showRecommendations =
    !sequence &&
    !post.shortform &&
    !post.draft &&
    !post.isEvent &&
    (wordCount ?? 0) >= 500;

  return (
    <PostDisplayProvider post={post}>
      <StructuredData data={postGetStructuredData(post)} />
      <ReadProgress post={post} readTimeMinutes={readTimeMinutes}>
        <PostColumn>
          <PostSequenceTopNavigation
            post={post}
            sequence={sequence}
            className="mb-2"
          />
          {post.question && (
            <Type style="bodyLarge" className="text-gray-600">
              [Question]
            </Type>
          )}
          <Type style="postsPageTitle" As="h1" className="mb-10" id="top">
            {post.draft && <span className="text-gray-600">[Draft] </span>}
            {post.title}
            {post.url && (
              <Tooltip As="span" title={<Type style="bodySmall">Link post</Type>}>
                <LinkIcon className="inline text-gray-600 w-6 ml-2" />
              </Tooltip>
            )}
          </Type>
          <div className="flex items-center gap-3 mb-6">
            <StackedUserAvatars
              users={[post.user, ...(post.coauthors ?? [])]}
              size={36}
            />
            <div className="leading-snug">
              <Type style="bodyLarge">
                <UsersName user={post.user} pageSectionContext="post_header" />
                {post.coauthors?.map((coauthor) => (
                  <Fragment key={coauthor._id}>
                    , <UsersName user={coauthor} pageSectionContext="post_header" />
                  </Fragment>
                ))}
              </Type>
              <Type style="bodyMedium" className="text-gray-600">
                {wordCount ? (
                  <Tooltip
                    As="span"
                    title={
                      <Type style="bodySmall">
                        {formatThousands(wordCount)} words
                      </Type>
                    }
                  >
                    {readTimeMinutes} min read
                  </Tooltip>
                ) : (
                  <>{readTimeMinutes} min read</>
                )}
                <span aria-hidden className="mx-1.5">
                  ·
                </span>
                <Tooltip
                  As="span"
                  title={
                    <Type style="bodySmall">
                      <div>Posted on {formatLongDateWithTime(post.postedAt)}</div>
                      {post.curatedDate && (
                        <div>
                          Curated on {formatLongDateWithTime(post.curatedDate)}
                        </div>
                      )}
                    </Type>
                  }
                >
                  {formatShortDate(post.postedAt)}
                </Tooltip>
                {pangramClassification && (
                  <>
                    <span aria-hidden className="mx-1.5">
                      ·
                    </span>
                    <PangramStatus
                      classification={pangramClassification}
                      fractionAi={post.contents?.pangramAiScore}
                      fractionAssisted={post.contents?.pangramFractionAiAssisted}
                      fractionHuman={post.contents?.pangramFractionHuman}
                    />
                  </>
                )}
              </Type>
            </div>
          </div>
          <div className="py-4 border-y border-posts-page-hr text-gray-600 flex">
            <div className="flex items-center gap-4 grow">
              <PostVoteButtons hideReacts />
              <Tooltip title={<Type style="bodySmall">Comments</Type>}>
                <Link href="#comments" className="hover:text-gray-1000">
                  <Type style="bodyLarge" className="flex items-center gap-1">
                    <ChatBubbleLeftIcon className="w-[22px]" />
                    {post.commentCount}
                  </Type>
                </Link>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <PostAudioToggle />
              <PostBookmark />
              <PostShareButton post={post} />
              <PostTripleDotMenu post={post} hideBookmark withBackground />
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
                <PostVoteButtons divider />
              </div>
              <div className="flex items-center gap-2">
                <PostShareButton post={post} />
                <PostTripleDotMenu post={post} hideBookmark withBackground />
              </div>
            </div>
          )}
          <Suspense>
            <PostSequenceBottomNavigation
              post={post}
              sequence={sequence}
              className="mb-12"
            />
          </Suspense>
          <Suspense>
            <PostPingbacks
              postId={postId}
              currentUser={currentUser}
              className="mb-12"
            />
          </Suspense>
          <Suspense>
            <PostTranslations postId={postId} className="mb-12" />
          </Suspense>
          {showRecommendations && (
            <Suspense
              fallback={<div className="rounded bg-gray-100 w-full h-[182px]" />}
            >
              <MorePostsLikeThis postId={post._id} />
            </Suspense>
          )}
        </PostColumn>
      </ReadProgress>
      <DigestPopup />
    </PostDisplayProvider>
  );
}

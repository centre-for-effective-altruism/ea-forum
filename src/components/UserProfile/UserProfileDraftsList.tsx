"use client";

import { useCallback, useState } from "react";
import type { SequenceBase } from "@/lib/sequences/sequenceQueries";
import type { CommentListItem } from "@/lib/comments/commentLists";
import type { PostListItem } from "@/lib/posts/postLists";
import { CommentsListProvider } from "../Comments/useCommentsList";
import InformationCircleIcon from "@heroicons/react/24/solid/InformationCircleIcon";
import SequenceCard from "../FeaturedCards/SequenceCard";
import UserProfileHeading from "./UserProfileHeading";
import CommentsList from "../Comments/CommentsList";
import TextLinkButton from "../TextLinkButton";
import PostsItem from "../PostsList/PostsItem";
import Tooltip from "../Tooltip";
import Button from "../Button";
import Type from "../Type";

export default function UserProfileDraftsList({
  isCurrentUser,
  posts,
  sequences,
  comments,
}: Readonly<{
  isCurrentUser: boolean;
  posts: PostListItem[];
  sequences: SequenceBase[];
  comments: CommentListItem[];
}>) {
  const [visible, setVisible] = useState(isCurrentUser);
  const [postsShown, setPostsShown] = useState(2);
  const [sequencesShown, setSequencesShown] = useState(3);
  const [commentsShown, setCommentsShown] = useState(2);

  const showMorePosts = useCallback(() => setPostsShown((n) => n + 10), []);
  const showMoreSequences = useCallback(() => setSequencesShown((n) => n + 9), []);
  const showMoreComments = useCallback(() => setCommentsShown((n) => n + 10), []);

  if (!visible) {
    return (
      <div data-component="UserPageDraftsList">
        <Button variant="greyOutlined" onClick={() => setVisible(true)}>
          Click to view drafts
        </Button>
      </div>
    );
  }

  return (
    <section
      data-component="UserPageDraftsList"
      id="drafts"
      className="bg-surface-floating rounded p-6 relative"
    >
      <Tooltip
        title={
          <Type style="bodySmall">
            This section is only visible to you and site admins
          </Type>
        }
        className="absolute top-6 right-6"
      >
        <InformationCircleIcon className="w-5" />
      </Tooltip>
      <UserProfileHeading>Drafts</UserProfileHeading>
      <Type style="sectionTitleSmall" className="mt-4 mb-3">
        Draft/hidden posts
      </Type>
      {posts.length > 0 ? (
        <div>
          <div className="max-w-full space-y-0.5">
            {posts.slice(0, postsShown).map((post) => (
              <PostsItem key={post._id} post={post} />
            ))}
          </div>
          {postsShown < posts.length && (
            <TextLinkButton onClick={showMorePosts} className="mt-2">
              Load more
            </TextLinkButton>
          )}
        </div>
      ) : (
        <Type className="text-gray-600">No posts to display</Type>
      )}
      <Type style="sectionTitleSmall" className="mt-4 mb-3">
        Draft/hidden sequences
      </Type>
      {sequences.length > 0 ? (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {sequences.slice(0, sequencesShown).map((sequence) => (
              <SequenceCard key={sequence._id} sequence={sequence} />
            ))}
          </div>
          {sequencesShown < sequences.length && (
            <TextLinkButton onClick={showMoreSequences} className="mt-2">
              Load more
            </TextLinkButton>
          )}
        </div>
      ) : (
        <Type className="text-gray-600">No sequences to display</Type>
      )}
      <Type style="sectionTitleSmall" className="mt-4 mb-3">
        Draft comments
      </Type>
      {comments.length > 0 ? (
        <div>
          <div className="flex flex-col gap-2">
            {comments.slice(0, commentsShown).map((comment) => (
              <CommentsListProvider
                key={comment._id}
                comments={[comment]}
                showPostTitle
              >
                <CommentsList />
              </CommentsListProvider>
            ))}
          </div>
          {commentsShown < comments.length && (
            <TextLinkButton onClick={showMoreComments} className="mt-2">
              Load more
            </TextLinkButton>
          )}
        </div>
      ) : (
        <Type className="text-gray-600">No comments to display</Type>
      )}
    </section>
  );
}

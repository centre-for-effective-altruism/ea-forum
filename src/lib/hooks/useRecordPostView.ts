"use client";

import { useCallback } from "react";
import type { RecentDiscussionPost } from "../recentDiscussions/fetchRecentDiscussions";
import type { JsonRecord } from "../typeHelpers";
import { useCurrentUser } from "./useCurrentUser";
import { useItemsRead } from "./useItemsRead";
import { useNewEvents } from "./useNewEvents";
import {
  increasePostViewCountAction,
  markPostCommentsReadAction,
} from "../posts/postActions";

type ViewablePost = Pick<
  RecentDiscussionPost,
  "_id" | "title" | "draft" | "readStatus"
>;

export const useRecordPostView = (post: ViewablePost) => {
  const { recordEvent } = useNewEvents();
  const { currentUser } = useCurrentUser();
  const { postsRead, setPostRead } = useItemsRead();
  const isRead = !!(post._id in postsRead
    ? postsRead[post._id]
    : post.readStatus?.[0]?.isRead);

  const recordPostView = useCallback(
    async ({
      post,
      extraEventProperties,
    }: {
      post: ViewablePost;
      extraEventProperties?: JsonRecord;
    }) => {
      try {
        if (!post) {
          throw new Error("Tried to record view of null post");
        }

        // A post id has been found & it's has not been seen yet on this client
        // session - update the client-side cache and notify the server
        if (!postsRead[post._id]) {
          setPostRead(post._id, true);
          void increasePostViewCountAction({ postId: post._id });
        }

        // Register page-visit event
        if (currentUser) {
          recordEvent("post-view", true, {
            userId: currentUser._id,
            important: false,
            intercom: true,
            ...extraEventProperties,
            documentId: post._id,
            postTitle: post.title,
          });
        }
      } catch (error) {
        console.error("recordPostView error:", error);
      }
    },
    [postsRead, setPostRead, currentUser, recordEvent],
  );

  const recordPostCommentsView = useCallback(
    (postId: string) => {
      if (currentUser) {
        if (!postsRead[postId]) {
          // Update the client-side read status cache. Set the value to true even
          // if technically we might be saving isRead to false on the server, if
          // the post hasn't been read before, to get the correct UI update.
          setPostRead(postId, true);

          // Calling `setPostRead` above ensures we only send an update to server
          // the first time this is triggered. Otherwise it becomes much more
          // likely that someone else posts a comment after the first time we
          // send this but then we send it again because e.g. the user clicked on
          // another comment (from the initial render).
          void markPostCommentsReadAction({ postId });
        }
      }
    },
    [currentUser, setPostRead, postsRead],
  );

  return { recordPostView, recordPostCommentsView, isRead };
};

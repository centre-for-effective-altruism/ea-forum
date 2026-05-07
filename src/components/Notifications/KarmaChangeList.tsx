"use client";

import { useCallback, useState } from "react";
import type { KarmaChanges } from "@/lib/users/karmaChangesTypes";
import KarmaChange from "./KarmaChange";
import Type from "../Type";

export default function KarmaChangeList({
  karmaChanges,
  truncateAt,
}: Readonly<{
  karmaChanges: KarmaChanges | null | undefined;
  truncateAt?: number;
}>) {
  // If there are more items total than we want to show, truncate the list.
  const [isTruncated, setIsTruncated] = useState(
    truncateAt !== undefined &&
      truncateAt > 0 &&
      (karmaChanges?.posts.length ?? 0) +
        (karmaChanges?.comments.length ?? 0) +
        (karmaChanges?.tagRevisions.length ?? 0) >
        truncateAt,
  );

  const untruncate = useCallback(() => setIsTruncated(false), []);

  let posts = karmaChanges?.posts;
  let comments = karmaChanges?.comments;
  let tagRevisions = karmaChanges?.tagRevisions;

  // If we're truncating the list, attempt to only show the first n items.
  if (isTruncated && truncateAt !== undefined) {
    let remainingItemCount = truncateAt;
    posts = posts?.slice(0, remainingItemCount);
    // Count how many notifications the posts will show
    const postNotificationCount =
      posts?.reduce((acc, post) => {
        return (
          acc +
          (post.scoreChange === 0 ? 0 : 1) +
          (Object.keys(post.addedReacts ?? {}).length ?? 0)
        );
      }, 0) ?? 0;
    // If we have n items, hide the rest
    if (posts && postNotificationCount >= remainingItemCount) {
      // If this is more than we want to show, remove the last post
      if (postNotificationCount > remainingItemCount) {
        posts.pop();
      }
      comments = [];
      tagRevisions = [];
    } else {
      remainingItemCount -= postNotificationCount;
      comments = comments?.slice(0, remainingItemCount);
      // Count how many notifications the comments will show
      const commentNotificationCount =
        comments?.reduce((acc, comment) => {
          return (
            acc +
            (comment.scoreChange === 0 ? 0 : 1) +
            (Object.keys(comment.addedReacts ?? {}).length ?? 0)
          );
        }, 0) ?? 0;
      // If we have n items, hide the rest
      if (comments && commentNotificationCount >= remainingItemCount) {
        // If this is more than we want to show, remove the last comment
        if (commentNotificationCount > remainingItemCount) {
          comments.pop();
        }
        tagRevisions = [];
      } else {
        remainingItemCount -= commentNotificationCount;
        tagRevisions = tagRevisions?.slice(0, remainingItemCount);
      }
    }
  }

  return (
    <div
      data-component="KarmaChangeList"
      className="flex flex-col gap-2 items-start"
    >
      {posts?.map((karmaChange) => (
        <KarmaChange key={karmaChange._id} postKarmaChange={karmaChange} />
      ))}
      {comments?.map((karmaChange) => (
        <KarmaChange key={karmaChange._id} commentKarmaChange={karmaChange} />
      ))}
      {tagRevisions?.map((karmaChange) => (
        <KarmaChange key={karmaChange._id} tagRevisionKarmaChange={karmaChange} />
      ))}
      {isTruncated && (
        <Type
          As="button"
          onClick={untruncate}
          className="
            cursor-pointer text-gray-600 hover:text-gray-1000 font-[600]!
          "
        >
          Show more
        </Type>
      )}
    </div>
  );
}

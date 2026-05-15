"use client";

import type { PostTag } from "@/lib/tags/tagQueries";
import { getVoteDownStrength, getVoteUpStrength } from "@/lib/votes/voteHelpers";
import { useOptionalPostDisplay } from "../PostsPage/usePostDisplay";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { userIsAdminOrMod } from "@/lib/users/userHelpers";
import { useVote } from "../Voting/useVote";
import VoteButton from "../Voting/VoteButton";
import Type from "../Type";

export default function TagRelevance({
  tag,
}: Readonly<{
  tag: PostTag;
}>) {
  const postDisplay = useOptionalPostDisplay();
  const { currentUser } = useCurrentUser();
  const { onVote, baseScore, voteType } = useVote({
    collectionName: "TagRels",
    document: tag.tagRel,
  });

  if (!postDisplay || !currentUser) {
    return null;
  }

  let downvoteDisabled = false;

  // The community tag can only be added or removed by admins and moderators.
  // The author of the post can add or upvote it, but not downvote or remove it.
  if (tag._id === process.env.NEXT_PUBLIC_COMMUNITY_TAG_ID) {
    if (userIsAdminOrMod(currentUser)) {
      // Voting always enabled for mods
    } else if (postDisplay.post.user?._id === currentUser._id) {
      downvoteDisabled = true;
    } else {
      return null;
    }
  }

  return (
    <div className="flex items-center">
      <Type style="bodySmall" className="text-gray-600 mr-1">
        Relevance
      </Type>
      <VoteButton
        currentVoteStrength={getVoteDownStrength(voteType ?? "neutral")}
        direction="Downvote"
        orientation="left"
        onVote={onVote}
        dimWhenNotVoted
        disabled={!downvoteDisabled}
      />
      <Type style="bodySmall" className="mx-[2px]">
        {baseScore}
      </Type>
      <VoteButton
        currentVoteStrength={getVoteUpStrength(voteType ?? "neutral")}
        direction="Upvote"
        orientation="right"
        onVote={onVote}
        dimWhenNotVoted
      />
    </div>
  );
}

import { expect, suite, test } from "vitest";
import { createTestComment, createTestPost, createTestUser } from "./testHelpers";
import { nDaysAgo } from "@/lib/timeUtils";
import { userSmallVotePower } from "@/lib/votes/voteHelpers";
import { performVote } from "@/lib/votes/voteMutations";
import { db } from "@/lib/db";

suite("Voting", () => {
  suite("Perform vote", () => {
    test("Can vote on post comment", async () => {
      const author = await createTestUser();
      expect(author.karma).toBe(0);
      expect(author.voteReceivedCount).toBe(null);
      expect(author.smallUpvoteReceivedCount).toBe(null);

      const yesterday = nDaysAgo(1);
      const post = await createTestPost({
        userId: author._id,
        createdAt: new Date(yesterday).toISOString(),
        inactive: true,
      });

      const commenter = await createTestUser();
      const comment = await createTestComment({
        userId: commenter._id,
        postId: post._id,
        inactive: true,
      });
      expect(comment.baseScore).toBe(0);
      expect(comment.voteCount).toBe(0);
      expect(comment.inactive).toBe(true);

      const voter = await createTestUser();
      expect(voter.voteCount).toBe(null);
      expect(voter.smallUpvoteCount).toBe(null);
      const power = userSmallVotePower(voter.karma, 1);
      expect(power).toBe(1);

      const { baseScore, voteCount, voteType, showVotingPatternWarning } =
        await performVote({
          collectionName: "Comments",
          document: comment,
          user: voter,
          voteType: "smallUpvote",
        });
      expect(baseScore).toBe(power);
      expect(voteCount).toBe(1);
      expect(voteType).toBe("smallUpvote");
      expect(showVotingPatternWarning).toBe(false);

      const [updatedCommenter, updatedVoter, updatedComment, vote] =
        await Promise.all([
          db.query.users.findFirst({
            where: {
              _id: commenter._id,
            },
          }),
          db.query.users.findFirst({
            where: {
              _id: voter._id,
            },
          }),
          db.query.comments.findFirst({
            where: {
              _id: comment._id,
            },
          }),
          db.query.votes.findFirst({
            where: {
              documentId: comment._id,
              userId: voter._id,
            },
          }),
        ]);
      expect(updatedCommenter!.karma).toBe(power);
      expect(updatedCommenter!.voteReceivedCount).toBe(1);
      expect(updatedCommenter!.smallUpvoteReceivedCount).toBe(1);
      expect(updatedVoter!.voteCount).toBe(1);
      expect(updatedVoter!.smallUpvoteCount).toBe(1);
      expect(updatedComment!.baseScore).toBe(power);
      expect(updatedComment!.voteCount).toBe(1);
      expect(updatedComment!.inactive).toBe(false);
      expect(vote!.voteType).toBe("smallUpvote");
      expect(vote!.power).toBe(power);
      expect(vote!.cancelled).toBe(false);
      expect(vote!.isUnvote).toBe(false);
    });
  });
});

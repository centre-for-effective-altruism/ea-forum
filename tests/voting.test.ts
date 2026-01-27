import { expect, suite, test } from "vitest";
import { createTestComment, createTestPost, createTestUser } from "./testHelpers";
import { nDaysAgo } from "@/lib/timeUtils";
import { userSmallVotePower } from "@/lib/votes/voteHelpers";
import { performVote } from "@/lib/votes/voteMutations";
import { db } from "@/lib/db";

suite("Voting", () => {
  suite("Perform vote", () => {
    test("Can vote and undo vote on post", async () => {
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
      expect(post.voteCount).toBe(0);
      expect(post.baseScore).toBe(0);
      expect(post.inactive).toBe(true);

      const voter = await createTestUser();
      expect(voter.voteCount).toBe(null);
      expect(voter.smallUpvoteCount).toBe(null);
      const power = userSmallVotePower(voter.karma, 1);
      expect(power).toBe(1);

      // Do the vote
      {
        const voteResult = await db.transaction((txn) =>
          performVote({
            txn,
            collectionName: "Posts",
            document: post,
            user: voter,
            voteType: "smallUpvote",
          }),
        );
        expect(voteResult.baseScore).toBe(power);
        expect(voteResult.voteCount).toBe(1);
        expect(voteResult.voteType).toBe("smallUpvote");
        expect(voteResult.showVotingPatternWarning).toBe(false);

        const [updatedAuthor, updatedVoter, updatedPost, votes] = await Promise.all([
          db.query.users.findFirst({
            where: {
              _id: author._id,
            },
          }),
          db.query.users.findFirst({
            where: {
              _id: voter._id,
            },
          }),
          db.query.posts.findFirst({
            where: {
              _id: post._id,
            },
          }),
          db.query.votes.findMany({
            where: {
              documentId: post._id,
              userId: voter._id,
            },
          }),
        ]);
        expect(updatedAuthor!.karma).toBe(power);
        expect(updatedAuthor!.voteReceivedCount).toBe(1);
        expect(updatedAuthor!.smallUpvoteReceivedCount).toBe(1);
        expect(updatedVoter!.voteCount).toBe(1);
        expect(updatedVoter!.smallUpvoteCount).toBe(1);
        expect(updatedPost!.baseScore).toBe(power);
        expect(updatedPost!.voteCount).toBe(1);
        expect(updatedPost!.inactive).toBe(false);
        expect(votes.length).toBe(1);
        const vote = votes[0];
        expect(vote!.voteType).toBe("smallUpvote");
        expect(vote!.power).toBe(power);
        expect(vote!.cancelled).toBe(false);
        expect(vote!.isUnvote).toBe(false);
      }

      // Undo the vote
      {
        const voteResult = await db.transaction((txn) =>
          performVote({
            txn,
            collectionName: "Posts",
            document: post,
            user: voter,
            voteType: "smallUpvote",
          }),
        );
        expect(voteResult.baseScore).toBe(0);
        expect(voteResult.voteCount).toBe(0);
        expect(voteResult.voteType).toBe("neutral");
        expect(voteResult.showVotingPatternWarning).toBe(false);

        const [updatedAuthor, updatedVoter, updatedPost, votes] = await Promise.all([
          db.query.users.findFirst({
            where: {
              _id: author._id,
            },
          }),
          db.query.users.findFirst({
            where: {
              _id: voter._id,
            },
          }),
          db.query.posts.findFirst({
            where: {
              _id: post._id,
            },
          }),
          db.query.votes.findMany({
            where: {
              documentId: post._id,
              userId: voter._id,
            },
            orderBy: {
              votedAt: "desc",
            },
          }),
        ]);
        expect(updatedAuthor!.karma).toBe(0);
        expect(updatedAuthor!.voteReceivedCount).toBe(0);
        expect(updatedAuthor!.smallUpvoteReceivedCount).toBe(0);
        expect(updatedVoter!.voteCount).toBe(0);
        expect(updatedVoter!.smallUpvoteCount).toBe(0);
        expect(updatedPost!.baseScore).toBe(0);
        expect(updatedPost!.voteCount).toBe(0);
        expect(updatedPost!.inactive).toBe(false);
        expect(votes.length).toBe(2);
        const unvote = votes[0];
        expect(unvote!.voteType).toBe("smallUpvote");
        expect(unvote!.power).toBe(-power);
        expect(unvote!.cancelled).toBe(true);
        expect(unvote!.isUnvote).toBe(true);
        const cancelledVote = votes[1];
        expect(cancelledVote!.voteType).toBe("smallUpvote");
        expect(cancelledVote!.power).toBe(power);
        expect(cancelledVote!.cancelled).toBe(true);
        expect(cancelledVote!.isUnvote).toBe(false);
      }
    });
    test("Can vote and overwrite vote on post", async () => {
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
      expect(post.voteCount).toBe(0);
      expect(post.baseScore).toBe(0);
      expect(post.inactive).toBe(true);

      const voter = await createTestUser();
      expect(voter.voteCount).toBe(null);
      expect(voter.smallUpvoteCount).toBe(null);
      const power = userSmallVotePower(voter.karma, 1);
      expect(power).toBe(1);

      // Do the initial vote
      {
        const voteResult = await db.transaction((txn) =>
          performVote({
            txn,
            collectionName: "Posts",
            document: post,
            user: voter,
            voteType: "smallUpvote",
          }),
        );
        expect(voteResult.baseScore).toBe(power);
        expect(voteResult.voteCount).toBe(1);
        expect(voteResult.voteType).toBe("smallUpvote");
        expect(voteResult.showVotingPatternWarning).toBe(false);

        const [updatedAuthor, updatedVoter, updatedPost, votes] = await Promise.all([
          db.query.users.findFirst({
            where: {
              _id: author._id,
            },
          }),
          db.query.users.findFirst({
            where: {
              _id: voter._id,
            },
          }),
          db.query.posts.findFirst({
            where: {
              _id: post._id,
            },
          }),
          db.query.votes.findMany({
            where: {
              documentId: post._id,
              userId: voter._id,
              cancelled: false,
            },
          }),
        ]);
        expect(updatedAuthor!.karma).toBe(power);
        expect(updatedAuthor!.voteReceivedCount).toBe(1);
        expect(updatedAuthor!.smallUpvoteReceivedCount).toBe(1);
        expect(updatedVoter!.voteCount).toBe(1);
        expect(updatedVoter!.smallUpvoteCount).toBe(1);
        expect(updatedPost!.baseScore).toBe(power);
        expect(updatedPost!.voteCount).toBe(1);
        expect(updatedPost!.inactive).toBe(false);
        expect(votes.length).toBe(1);
        const vote = votes[0];
        expect(vote!.voteType).toBe("smallUpvote");
        expect(vote!.power).toBe(power);
        expect(vote!.cancelled).toBe(false);
        expect(vote!.isUnvote).toBe(false);
      }

      // Overwrite it with a vote of a different type
      {
        const voteResult = await db.transaction((txn) =>
          performVote({
            txn,
            collectionName: "Posts",
            document: post,
            user: voter,
            voteType: "smallDownvote",
          }),
        );
        expect(voteResult.baseScore).toBe(-power);
        expect(voteResult.voteCount).toBe(1);
        expect(voteResult.voteType).toBe("smallDownvote");
        expect(voteResult.showVotingPatternWarning).toBe(false);

        const [updatedAuthor, updatedVoter, updatedPost, votes] = await Promise.all([
          db.query.users.findFirst({
            where: {
              _id: author._id,
            },
          }),
          db.query.users.findFirst({
            where: {
              _id: voter._id,
            },
          }),
          db.query.posts.findFirst({
            where: {
              _id: post._id,
            },
          }),
          db.query.votes.findMany({
            where: {
              documentId: post._id,
              userId: voter._id,
              cancelled: false,
            },
          }),
        ]);
        expect(updatedAuthor!.karma).toBe(-power);
        expect(updatedAuthor!.voteReceivedCount).toBe(1);
        expect(updatedAuthor!.smallUpvoteReceivedCount).toBe(0);
        expect(updatedAuthor!.smallDownvoteReceivedCount).toBe(1);
        expect(updatedVoter!.voteCount).toBe(1);
        expect(updatedVoter!.smallUpvoteCount).toBe(0);
        expect(updatedVoter!.smallDownvoteCount).toBe(1);
        expect(updatedPost!.baseScore).toBe(-power);
        expect(updatedPost!.voteCount).toBe(1);
        expect(updatedPost!.inactive).toBe(false);
        expect(votes.length).toBe(1);
        const vote = votes[0];
        expect(vote!.voteType).toBe("smallDownvote");
        expect(vote!.power).toBe(-power);
        expect(vote!.cancelled).toBe(false);
        expect(vote!.isUnvote).toBe(false);
      }
    });
    test("Can vote and undo vote on post comment", async () => {
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

      // Do the vote
      {
        const voteResult = await db.transaction((txn) =>
          performVote({
            txn,
            collectionName: "Comments",
            document: comment,
            user: voter,
            voteType: "smallUpvote",
          }),
        );
        expect(voteResult.baseScore).toBe(power);
        expect(voteResult.voteCount).toBe(1);
        expect(voteResult.voteType).toBe("smallUpvote");
        expect(voteResult.showVotingPatternWarning).toBe(false);

        const [updatedCommenter, updatedVoter, updatedComment, votes] =
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
            db.query.votes.findMany({
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
        expect(votes.length).toBe(1);
        const vote = votes[0];
        expect(vote!.voteType).toBe("smallUpvote");
        expect(vote!.power).toBe(power);
        expect(vote!.cancelled).toBe(false);
        expect(vote!.isUnvote).toBe(false);
      }

      // Undo the vote
      {
        const voteResult = await db.transaction((txn) =>
          performVote({
            txn,
            collectionName: "Comments",
            document: comment,
            user: voter,
            voteType: "smallUpvote",
          }),
        );
        expect(voteResult.baseScore).toBe(0);
        expect(voteResult.voteCount).toBe(0);
        expect(voteResult.voteType).toBe("neutral");
        expect(voteResult.showVotingPatternWarning).toBe(false);

        const [updatedCommenter, updatedVoter, updatedComment, votes] =
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
            db.query.votes.findMany({
              where: {
                documentId: comment._id,
                userId: voter._id,
              },
              orderBy: {
                votedAt: "desc",
              },
            }),
          ]);
        expect(updatedCommenter!.karma).toBe(0);
        expect(updatedCommenter!.voteReceivedCount).toBe(0);
        expect(updatedCommenter!.smallUpvoteReceivedCount).toBe(0);
        expect(updatedVoter!.voteCount).toBe(0);
        expect(updatedVoter!.smallUpvoteCount).toBe(0);
        expect(updatedComment!.baseScore).toBe(0);
        expect(updatedComment!.voteCount).toBe(0);
        expect(updatedComment!.inactive).toBe(false);
        expect(votes.length).toBe(2);
        const unvote = votes[0];
        expect(unvote!.voteType).toBe("smallUpvote");
        expect(unvote!.power).toBe(-power);
        expect(unvote!.cancelled).toBe(true);
        expect(unvote!.isUnvote).toBe(true);
        const cancelledVote = votes[1];
        expect(cancelledVote!.voteType).toBe("smallUpvote");
        expect(cancelledVote!.power).toBe(power);
        expect(cancelledVote!.cancelled).toBe(true);
        expect(cancelledVote!.isUnvote).toBe(false);
      }
    });
    test("Can vote and overwrite vote on post comment", async () => {
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

      // Do the initial vote
      {
        const voteResult = await db.transaction((txn) =>
          performVote({
            txn,
            collectionName: "Comments",
            document: comment,
            user: voter,
            voteType: "smallUpvote",
          }),
        );
        expect(voteResult.baseScore).toBe(power);
        expect(voteResult.voteCount).toBe(1);
        expect(voteResult.voteType).toBe("smallUpvote");
        expect(voteResult.showVotingPatternWarning).toBe(false);

        const [updatedCommenter, updatedVoter, updatedComment, votes] =
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
            db.query.votes.findMany({
              where: {
                documentId: comment._id,
                userId: voter._id,
                cancelled: false,
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
        expect(votes.length).toBe(1);
        const vote = votes[0];
        expect(vote!.voteType).toBe("smallUpvote");
        expect(vote!.power).toBe(power);
        expect(vote!.cancelled).toBe(false);
        expect(vote!.isUnvote).toBe(false);
      }

      // Overwrite it with a vote of a different type
      {
        const voteResult = await db.transaction((txn) =>
          performVote({
            txn,
            collectionName: "Comments",
            document: comment,
            user: voter,
            voteType: "smallDownvote",
          }),
        );
        expect(voteResult.baseScore).toBe(-power);
        expect(voteResult.voteCount).toBe(1);
        expect(voteResult.voteType).toBe("smallDownvote");
        expect(voteResult.showVotingPatternWarning).toBe(false);

        const [updatedCommenter, updatedVoter, updatedComment, votes] =
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
            db.query.votes.findMany({
              where: {
                documentId: comment._id,
                userId: voter._id,
                cancelled: false,
              },
            }),
          ]);
        expect(updatedCommenter!.karma).toBe(-power);
        expect(updatedCommenter!.voteReceivedCount).toBe(1);
        expect(updatedCommenter!.smallUpvoteReceivedCount).toBe(0);
        expect(updatedCommenter!.smallDownvoteReceivedCount).toBe(1);
        expect(updatedVoter!.voteCount).toBe(1);
        expect(updatedVoter!.smallUpvoteCount).toBe(0);
        expect(updatedVoter!.smallDownvoteCount).toBe(1);
        expect(updatedComment!.baseScore).toBe(-power);
        expect(updatedComment!.voteCount).toBe(1);
        expect(updatedComment!.inactive).toBe(false);
        expect(votes.length).toBe(1);
        const vote = votes[0];
        expect(vote!.voteType).toBe("smallDownvote");
        expect(vote!.power).toBe(-power);
        expect(vote!.cancelled).toBe(false);
        expect(vote!.isUnvote).toBe(false);
      }
    });
  });
});

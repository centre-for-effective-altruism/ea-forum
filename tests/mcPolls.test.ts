import { suite, test, expect, beforeEach } from "vitest";
import {
  createTestUser,
  createTestPost,
  createTestRevision,
} from "./testHelpers";
import { forumEvents } from "@/lib/schema";
import { db } from "@/lib/db";
import {
  upsertPolls,
  addMcPollVote,
  removeMcPollVote,
} from "@/lib/forumEvents/forumEventMutations";
import {
  getMcPollPublicData,
  McPollAnswer,
} from "@/lib/forumEvents/forumEventHelpers";
import { fetchForumEventById } from "@/lib/forumEvents/forumEventQueries";
import { aggregateMcPollVotes } from "@/lib/utils/pollHelpers";
import { userBaseProjection } from "@/lib/users/userQueries";

const mcPollMarkup = (
  id: string,
  {
    answers,
    multiSelect = false,
  }: { answers: McPollAnswer[]; multiSelect?: boolean },
) =>
  `<div class="ck-poll" data-internal-id="${id}" data-props='${JSON.stringify({
    question: "Which cause area should receive the most funding?",
    agreeWording: "agree",
    disagreeWording: "disagree",
    duration: { days: 3, hours: 0, minutes: 0 },
    colorScheme: {
      lightColor: "#ffffff",
      darkColor: "#000000",
      bannerTextColor: "#ffffff",
    },
    answers,
    multiSelect,
  })}'></div>`;

const createMcPoll = async (
  id: string,
  opts: { answers: McPollAnswer[]; multiSelect?: boolean },
) => {
  const [user, post, revision] = await Promise.all([
    createTestUser(),
    createTestPost(),
    createTestRevision({
      collectionName: "Posts",
      fieldName: "contents",
      html: mcPollMarkup(id, opts),
    }),
  ]);
  await upsertPolls({ txn: db, user, revision, post });
  return { user, post };
};

const voteIdsFor = async (forumEventId: string, userId: string) => {
  const event = await fetchForumEventById(forumEventId);
  return getMcPollPublicData(event).votes[userId]?.answerIds;
};

suite("Multiple-choice polls", () => {
  beforeEach(async () => {
    await db.delete(forumEvents);
  });

  suite("upsertPolls (MC_POLL)", () => {
    test("creates an MC_POLL forum event from markup with answers", async () => {
      await createMcPoll("mc-create", {
        answers: [
          { _id: "a1", text: "Global health" },
          { _id: "a2", text: "Animal welfare" },
        ],
        multiSelect: true,
      });
      const event = await fetchForumEventById("mc-create");
      expect(event).toBeTruthy();
      expect(event!.eventFormat).toBe("MC_POLL");
      const data = getMcPollPublicData(event);
      expect(data.answers.map((a) => a.text)).toEqual([
        "Global health",
        "Animal welfare",
      ]);
      expect(data.multiSelect).toBe(true);
      expect(data.votes).toEqual({});
    });

    test("editing answers preserves existing votes", async () => {
      const { user, post } = await createMcPoll("mc-edit", {
        answers: [
          { _id: "a1", text: "One" },
          { _id: "a2", text: "Two" },
        ],
      });
      await addMcPollVote({
        currentUser: user,
        forumEventId: "mc-edit",
        answerIds: ["a1"],
      });

      // Re-save with reworded a1 and an extra answer
      const revision = await createTestRevision({
        collectionName: "Posts",
        fieldName: "contents",
        html: mcPollMarkup("mc-edit", {
          answers: [
            { _id: "a1", text: "One (edited)" },
            { _id: "a2", text: "Two" },
            { _id: "a3", text: "Three" },
          ],
        }),
      });
      await upsertPolls({ txn: db, user, revision, post });

      const data = getMcPollPublicData(await fetchForumEventById("mc-edit"));
      expect(data.answers.map((a) => a.text)).toEqual([
        "One (edited)",
        "Two",
        "Three",
      ]);
      expect(data.votes[user._id]?.answerIds).toEqual(["a1"]);
    });
  });

  suite("addMcPollVote / removeMcPollVote", () => {
    test("single-select replaces the previous selection", async () => {
      const { user } = await createMcPoll("mc-single", {
        answers: [
          { _id: "a1", text: "A" },
          { _id: "a2", text: "B" },
        ],
        multiSelect: false,
      });
      await addMcPollVote({
        currentUser: user,
        forumEventId: "mc-single",
        answerIds: ["a1"],
      });
      expect(await voteIdsFor("mc-single", user._id)).toEqual(["a1"]);

      await addMcPollVote({
        currentUser: user,
        forumEventId: "mc-single",
        answerIds: ["a2"],
      });
      expect(await voteIdsFor("mc-single", user._id)).toEqual(["a2"]);
    });

    test("single-select keeps only the first answer even if more are sent", async () => {
      const { user } = await createMcPoll("mc-single-clamp", {
        answers: [
          { _id: "a1", text: "A" },
          { _id: "a2", text: "B" },
        ],
        multiSelect: false,
      });
      await addMcPollVote({
        currentUser: user,
        forumEventId: "mc-single-clamp",
        answerIds: ["a1", "a2"],
      });
      expect(await voteIdsFor("mc-single-clamp", user._id)).toEqual(["a1"]);
    });

    test("multi-select stores the submitted set", async () => {
      const { user } = await createMcPoll("mc-multi", {
        answers: [
          { _id: "a1", text: "A" },
          { _id: "a2", text: "B" },
          { _id: "a3", text: "C" },
        ],
        multiSelect: true,
      });
      await addMcPollVote({
        currentUser: user,
        forumEventId: "mc-multi",
        answerIds: ["a1", "a2"],
      });
      expect((await voteIdsFor("mc-multi", user._id))?.sort()).toEqual([
        "a1",
        "a2",
      ]);

      // Re-submitting a smaller set replaces the previous one
      await addMcPollVote({
        currentUser: user,
        forumEventId: "mc-multi",
        answerIds: ["a2"],
      });
      expect(await voteIdsFor("mc-multi", user._id)).toEqual(["a2"]);
    });

    test("submitting an empty set removes the vote", async () => {
      const { user } = await createMcPoll("mc-empty", {
        answers: [{ _id: "a1", text: "A" }],
        multiSelect: true,
      });
      await addMcPollVote({
        currentUser: user,
        forumEventId: "mc-empty",
        answerIds: ["a1"],
      });
      await addMcPollVote({
        currentUser: user,
        forumEventId: "mc-empty",
        answerIds: [],
      });
      expect(await voteIdsFor("mc-empty", user._id)).toBeUndefined();
    });

    test("removeMcPollVote clears the user's vote", async () => {
      const { user } = await createMcPoll("mc-remove", {
        answers: [
          { _id: "a1", text: "A" },
          { _id: "a2", text: "B" },
        ],
      });
      await addMcPollVote({
        currentUser: user,
        forumEventId: "mc-remove",
        answerIds: ["a1"],
      });
      await removeMcPollVote(user, "mc-remove");
      expect(await voteIdsFor("mc-remove", user._id)).toBeUndefined();
    });

    test("rejects an unknown answer id", async () => {
      const { user } = await createMcPoll("mc-unknown", {
        answers: [{ _id: "a1", text: "A" }],
      });
      await expect(
        addMcPollVote({
          currentUser: user,
          forumEventId: "mc-unknown",
          answerIds: ["does-not-exist"],
        }),
      ).rejects.toThrow("Unknown answer");
    });

    test("rejects voting after the poll has closed", async () => {
      const user = await createTestUser();
      await db.insert(forumEvents).values({
        _id: "mc-closed",
        title: "Closed poll",
        eventFormat: "MC_POLL",
        startDate: new Date("2000-01-01").toISOString(),
        endDate: new Date("2000-01-02").toISOString(),
        createdAt: new Date("2000-01-01").toISOString(),
        publicData: {
          answers: [{ _id: "a1", text: "A" }],
          multiSelect: false,
          votes: {},
        },
      });
      await expect(
        addMcPollVote({
          currentUser: user,
          forumEventId: "mc-closed",
          answerIds: ["a1"],
        }),
      ).rejects.toThrow("voting has closed");
    });
  });

  suite("aggregateMcPollVotes", () => {
    test("computes counts and percentages per answer", async () => {
      const [u1, u2, u3] = await Promise.all([
        createTestUser(),
        createTestUser(),
        createTestUser(),
      ]);
      await db.insert(forumEvents).values({
        _id: "mc-agg",
        title: "Aggregation poll",
        eventFormat: "MC_POLL",
        startDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        publicData: {
          answers: [
            { _id: "a1", text: "A" },
            { _id: "a2", text: "B" },
          ],
          multiSelect: false,
          votes: {
            [u1._id]: { answerIds: ["a1"] },
            [u2._id]: { answerIds: ["a1"] },
            [u3._id]: { answerIds: ["a2"] },
          },
        },
      });

      const event = await fetchForumEventById("mc-agg");
      const voters = await db.query.users.findMany({
        ...userBaseProjection,
        where: { _id: { in: [u1._id, u2._id, u3._id] } },
      });

      const { results, voterCount } = aggregateMcPollVotes({
        voters,
        comments: null,
        event,
        currentUser: null,
      });

      expect(voterCount).toBe(3);
      const a1 = results.find((r) => r.answer._id === "a1");
      const a2 = results.find((r) => r.answer._id === "a2");
      expect(a1?.count).toBe(2);
      expect(a1?.pct).toBe(67);
      expect(a1?.voters).toHaveLength(2);
      expect(a2?.count).toBe(1);
      expect(a2?.pct).toBe(33);
    });
  });
});

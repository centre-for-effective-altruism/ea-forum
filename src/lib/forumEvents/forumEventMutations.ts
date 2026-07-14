import "server-only";
import { load as cheerioLoad } from "cheerio";
import { db, DbOrTransaction } from "../db";
import { sql } from "drizzle-orm";
import type { EditorContents } from "../ckeditor/editorHelpers";
import type { CurrentUser } from "../users/currentUser";
import { randomId } from "../utils/random";
import { isAnyTest } from "../environment";
import { updateWithFieldChanges } from "../fieldChanges";
import {
  addUserPollVote,
  addUserMcPollVote,
  buildForumEventRevisions,
  removeUserPollVote,
  removeUserMcPollVote,
  setLatestPollVote,
  setLatestMcPollVote,
  setMcPollOptions,
} from "./forumEventQueries";
import {
  forumEvents,
  Comment,
  ForumEvent,
  Revision,
  InsertForumEvent,
  Post,
} from "../schema";
import {
  endDateFromDuration,
  ForumEventPollVote,
  getMcPollPublicData,
  McPollPublicData,
  PollProps,
  pollPropsIsMultipleChoice,
  pollPropsSchema,
  revisionIsAllowedPolls,
} from "./forumEventHelpers";

type CreateForumEventData = Omit<
  InsertForumEvent,
  | "frontpageDescription"
  | "frontpageDescriptionLatest"
  | "frontpageDescriptionMobile"
  | "frontpageDescriptionMobileLatest"
  | "postPageDescription"
  | "postPageDescriptionLatest"
  | "pollQuestion"
  | "pollQuestionLatest"
  | "createdAt"
  | "includesPoll" // This field is deprecated
>;

type UpdateForumEventData = Partial<Omit<CreateForumEventData, "_id">>;

const createForumEvent = async ({
  txn,
  user,
  data,
  ...editableFields
}: {
  txn: DbOrTransaction;
  user: CurrentUser;
  data: CreateForumEventData;
  frontpageDescription?: EditorContents;
  frontpageDescriptionMobile?: EditorContents;
  postPageDescription?: EditorContents;
  pollQuestion?: EditorContents;
}) => {
  const documentId = data._id ?? randomId();
  const revisions = await buildForumEventRevisions(
    txn,
    user,
    documentId,
    editableFields,
  );
  await txn.insert(forumEvents).values({
    ...data,
    ...revisions,
    _id: documentId,
    createdAt: new Date().toISOString(),
  });
};

const updateForumEvent = async ({
  txn,
  user,
  documentId,
  data,
  ...editableFields
}: {
  txn: DbOrTransaction;
  user: CurrentUser;
  documentId: string;
  data: UpdateForumEventData;
  frontpageDescription?: EditorContents;
  frontpageDescriptionMobile?: EditorContents;
  postPageDescription?: EditorContents;
  pollQuestion?: EditorContents;
}) => {
  const revisions = await buildForumEventRevisions(
    txn,
    user,
    documentId,
    editableFields,
  );
  await updateWithFieldChanges(txn, user, forumEvents, documentId, {
    ...data,
    ...revisions,
  });
};

/**
 * Shared create/update path for both poll formats. Computes the shared fields
 * (endDate — fixed once the parent is published — colour columns, post/comment
 * links, revisioned question) and dispatches create vs update. `formatData`
 * carries the format-specific columns, `publicData` seeds a new event, and
 * `afterUpdate` runs format-specific follow-up on the update path (e.g.
 * refreshing multiple-choice answers without clobbering votes).
 */
const persistPoll = async ({
  txn,
  user,
  _id,
  post,
  comment,
  existingPoll,
  duration,
  question,
  colorScheme,
  formatData,
  publicData,
  afterUpdate,
}: {
  txn: DbOrTransaction;
  user: CurrentUser;
  _id: string;
  post: Pick<Post, "_id" | "draft">;
  comment?: Pick<Comment, "_id" | "draft">;
  existingPoll?: Pick<ForumEvent, "_id" | "endDate">;
  duration: PollProps["duration"];
  question: string;
  colorScheme: PollProps["colorScheme"];
  formatData: UpdateForumEventData;
  publicData?: McPollPublicData;
  afterUpdate?: (documentId: string) => Promise<void>;
}) => {
  const parentIsDraft = comment ? comment.draft : post.draft;
  // Poll timer starts when the post/comment is published. Don't update the end
  // date after that.
  const endDate =
    existingPoll?.endDate ??
    (parentIsDraft ? null : endDateFromDuration(duration).toISOString());
  const pollQuestion = {
    data: `<p>${question}</p>`,
    type: "ckEditorMarkup" as const,
  };
  const data = {
    ...formatData,
    endDate,
    ...colorScheme,
    postId: post._id,
    commentId: comment?._id,
  };
  if (existingPoll) {
    await updateForumEvent({
      txn,
      user,
      documentId: existingPoll._id,
      data,
      pollQuestion,
    });
    await afterUpdate?.(existingPoll._id);
    return;
  }
  await createForumEvent({
    txn,
    user,
    pollQuestion,
    data: {
      _id,
      title: `New Poll for ${_id}`,
      startDate: new Date().toISOString(),
      isGlobal: false,
      ...(publicData !== undefined ? { publicData } : {}),
      ...data,
    },
  });
};

type UpsertPollArgs = {
  txn: DbOrTransaction;
  user: CurrentUser;
  _id: string;
  existingPoll?: Pick<ForumEvent, "_id" | "endDate">;
  post: Pick<Post, "_id" | "draft">;
  comment?: Pick<Comment, "_id" | "draft">;
} & PollProps;

/** Upsert a ForumEvent with eventFormat = "POLL" (agree/disagree slider) */
const upsertPoll = ({
  txn,
  user,
  _id,
  post,
  comment,
  existingPoll,
  question,
  agreeWording,
  disagreeWording,
  colorScheme,
  duration,
}: UpsertPollArgs) =>
  persistPoll({
    txn,
    user,
    _id,
    post,
    comment,
    existingPoll,
    duration,
    question,
    colorScheme,
    formatData: {
      eventFormat: "POLL",
      pollAgreeWording: agreeWording,
      pollDisagreeWording: disagreeWording,
    },
  });

/** Upsert a ForumEvent with eventFormat = "MC_POLL" (multiple-choice poll) */
const upsertMcPoll = ({
  txn,
  user,
  _id,
  post,
  comment,
  existingPoll,
  question,
  answers,
  multiSelect,
  agreeWording,
  disagreeWording,
  colorScheme,
  duration,
}: UpsertPollArgs) => {
  const answerList = answers ?? [];
  return persistPoll({
    txn,
    user,
    _id,
    post,
    comment,
    existingPoll,
    duration,
    question,
    colorScheme,
    // Store multiple-choice polls with the same shape as the slider so the row
    // is accepted by the shared "ForumEvents" table (owned by the older
    // codebase): its `eventFormat` column only permits the existing values, and
    // its agree/disagree wording columns are NOT NULL. The multiple-choice
    // variant is identified by `publicData.answers`, not by `eventFormat`.
    formatData: {
      eventFormat: "POLL",
      pollAgreeWording: agreeWording,
      pollDisagreeWording: disagreeWording,
    },
    publicData: { answers: answerList, multiSelect: !!multiSelect, votes: {} },
    // Update the answer options/mode without clobbering existing votes.
    afterUpdate: (documentId) =>
      setMcPollOptions(txn, documentId, answerList, !!multiSelect),
  });
};

export const upsertPolls = async ({
  txn,
  user,
  revision,
  post,
  comment,
}: {
  txn: DbOrTransaction;
  user: CurrentUser;
  revision: Revision;
  post: Pick<Post, "_id" | "draft">;
  comment?: Comment;
}) => {
  if (!revisionIsAllowedPolls(revision) || !revision.html) {
    return;
  }

  const $ = cheerioLoad(revision.html, null, false);
  const pollElements = $(".ck-poll[data-internal-id]");
  const pollData = pollElements
    .map((_, element) => {
      const internalId = $(element).attr("data-internal-id");
      const props = $(element).attr("data-props");
      if (!props) {
        return null;
      }
      try {
        const rawParsedProps = JSON.parse(props);
        const validationResult = pollPropsSchema.safeParse(rawParsedProps);
        if (!validationResult.success) {
          throw new Error(
            `Invalid poll props found for internalId ${internalId}: ${JSON.stringify(validationResult.error.issues)}`,
          );
        }
        const parsedProps = validationResult.data;
        return { _id: internalId, ...parsedProps };
      } catch (error) {
        if (!isAnyTest()) {
          console.error(`Error parsing poll props for ${internalId}:`, error);
        }
        return null;
      }
    })
    .get()
    .filter((item): item is { _id: string } & PollProps => item !== null);

  if (!pollData?.length) {
    return;
  }

  const existingPolls = await txn.query.forumEvents.findMany({
    columns: {
      _id: true,
      endDate: true,
    },
    where: {
      _id: { in: pollData.map(({ _id }) => _id) },
    },
  });

  // Upsert a poll for each internal id found in the HTML
  await Promise.all(
    pollData.map((data) => {
      const existingPoll = existingPolls.find(
        (poll) => poll && poll._id === data._id,
      );
      return pollPropsIsMultipleChoice(data)
        ? upsertMcPoll({ txn, user, ...data, post, comment, existingPoll })
        : upsertPoll({ txn, user, ...data, post, comment, existingPoll });
    }),
  );
};

/**
 * Assert a fetched forum event exists and its voting window is still open,
 * returning the (narrowed) event. Shared by every poll vote mutation.
 */
const assertPollVotingOpen = <T extends { endDate: string | Date | null }>(
  event: T | undefined | null,
): T => {
  if (!event) {
    throw new Error("Event not found");
  }
  if (event.endDate && new Date(event.endDate) < new Date()) {
    throw new Error("Cannot edit vote after voting has closed");
  }
  return event;
};

export const addPollVote = async ({
  currentUser,
  forumEventId,
  x,
  delta,
  postIds,
}: {
  currentUser: CurrentUser;
  forumEventId: string;
  x: number;
  delta?: number;
  postIds?: string[];
}) => {
  const event = assertPollVotingOpen(
    await db.query.forumEvents.findFirst({
      columns: {
        _id: true,
        endDate: true,
      },
      where: {
        _id: forumEventId,
      },
      extras: {
        oldVote: (forumEvents) =>
          sql<ForumEventPollVote>`${forumEvents.publicData}->${currentUser._id}`,
      },
    }),
  );

  const voteData: ForumEventPollVote = {
    x,
    points: event.oldVote?.points ?? {},
  };

  // Update the points associated with this vote if there was a change and that
  // change was associated with posts
  if (postIds?.length && !!delta) {
    const pointsPerPost = Math.abs(delta);
    for (const postId of postIds) {
      // Each post gets points equal to the max change attributed to that post
      voteData.points[postId] = Math.max(
        pointsPerPost,
        voteData.points?.[postId] ?? 0,
      );
    }
  }

  await db.transaction(async (txn) => {
    await Promise.all([
      addUserPollVote(txn, currentUser, event, voteData),
      setLatestPollVote(txn, currentUser, event, x),
    ]);
  });
};

export const removePollVote = async (
  currentUser: CurrentUser,
  forumEventId: string,
) => {
  const event = assertPollVotingOpen(
    await db.query.forumEvents.findFirst({
      columns: {
        _id: true,
        endDate: true,
      },
      where: {
        _id: forumEventId,
      },
    }),
  );
  await db.transaction(async (txn) => {
    await Promise.all([
      removeUserPollVote(txn, currentUser, event),
      setLatestPollVote(txn, currentUser, event, null),
    ]);
  });
};

/**
 * Set a user's vote in a multiple-choice poll to the given answer set. The
 * client sends the full desired selection (a single answer for single-select,
 * or the submitted set for multi-select). Returns the resulting selection.
 */
export const addMcPollVote = async ({
  currentUser,
  forumEventId,
  answerIds,
}: {
  currentUser: CurrentUser;
  forumEventId: string;
  answerIds: string[];
}) => {
  const event = assertPollVotingOpen(
    await db.query.forumEvents.findFirst({
      columns: {
        _id: true,
        endDate: true,
        publicData: true,
      },
      where: {
        _id: forumEventId,
      },
    }),
  );

  const pollData = getMcPollPublicData(event);
  const validAnswerIds = new Set(pollData.answers.map((answer) => answer._id));
  // De-dupe, and enforce a single choice server-side for single-select polls.
  const requested = pollData.multiSelect ? answerIds : answerIds.slice(0, 1);
  const newAnswerIds = [...new Set(requested)];
  for (const answerId of newAnswerIds) {
    if (!validAnswerIds.has(answerId)) {
      throw new Error("Unknown answer");
    }
  }

  await db.transaction(async (txn) => {
    if (newAnswerIds.length === 0) {
      await Promise.all([
        removeUserMcPollVote(txn, currentUser, event),
        setLatestMcPollVote(txn, currentUser, event, null),
      ]);
    } else {
      await Promise.all([
        addUserMcPollVote(txn, currentUser, event, { answerIds: newAnswerIds }),
        setLatestMcPollVote(txn, currentUser, event, newAnswerIds),
      ]);
    }
  });

  return newAnswerIds;
};

export const removeMcPollVote = async (
  currentUser: CurrentUser,
  forumEventId: string,
) => {
  // Removing a vote is just submitting an empty selection.
  await addMcPollVote({ currentUser, forumEventId, answerIds: [] });
};

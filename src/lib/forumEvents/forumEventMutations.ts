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
  buildForumEventRevisions,
  removeUserPollVote,
  setLatestPollVote,
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
  PollProps,
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

/** Upsert a ForumEvent with eventFormat = "POLL" */
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
}: {
  txn: DbOrTransaction;
  user: CurrentUser;
  _id: string;
  existingPoll?: Pick<ForumEvent, "_id" | "endDate">;
  post: Pick<Post, "_id" | "draft">;
  comment?: Pick<Comment, "_id" | "draft">;
} & PollProps) => {
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
    eventFormat: "POLL" as const,
    pollAgreeWording: agreeWording,
    pollDisagreeWording: disagreeWording,
    endDate,
    ...colorScheme,
    postId: post._id,
    commentId: comment?._id,
  };
  if (existingPoll) {
    return updateForumEvent({
      txn,
      user,
      documentId: existingPoll._id,
      data,
      pollQuestion,
    });
  }
  return createForumEvent({
    txn,
    user,
    pollQuestion,
    data: {
      _id,
      title: `New Poll for ${_id}`,
      startDate: new Date().toISOString(),
      isGlobal: false,
      ...data,
    },
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
      return upsertPoll({ txn, user, ...data, post, comment, existingPoll });
    }),
  );
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
  const event = await db.query.forumEvents.findFirst({
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
  });
  if (!event) {
    throw new Error("Event not found");
  }
  if (event?.endDate && new Date(event.endDate) < new Date()) {
    throw new Error("Cannot edit vote after voting has closed");
  }

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
  const event = await db.query.forumEvents.findFirst({
    columns: {
      _id: true,
      endDate: true,
    },
    where: {
      _id: forumEventId,
    },
  });
  if (!event) {
    throw new Error("Event not found");
  }
  if (event.endDate && new Date(event.endDate) < new Date()) {
    throw new Error("Cannot edit vote after voting has closed");
  }
  await db.transaction(async (txn) => {
    await Promise.all([
      removeUserPollVote(txn, currentUser, event),
      setLatestPollVote(txn, currentUser, event, null),
    ]);
  });
};

import "server-only";
import { load as cheerioLoad } from "cheerio";
import type { DbOrTransaction } from "../db";
import type { EditorContents } from "../ckeditor/editorHelpers";
import type { CurrentUser } from "../users/currentUser";
import { randomId } from "../utils/random";
import { isAnyTest } from "../environment";
import { updateWithFieldChanges } from "../fieldChanges";
import { buildForumEventRevisions } from "./forumEventQueries";
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

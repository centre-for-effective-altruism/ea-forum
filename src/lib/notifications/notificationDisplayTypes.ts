import z from "zod/v4";

// TODO: A lot of this is marked as nullable, but it's not actually nullable

const dateSchema = z
  .union([z.string(), z.date()])
  .pipe(z.transform((val) => (val instanceof Date ? val : new Date(val))))
  .nullable();

// We need enough fields here to render the user tooltip
const notificationDisplayUserSchema = z.object({
  _id: z.string(),
  slug: z.string().nullable(),
  createdAt: dateSchema,
  displayName: z.string().nullable(),
  profileImageId: z.string().nullable(),
  karma: z.number().nullable(),
  deleted: z.boolean().nullable(),
  htmlBio: z.string().nullable(),
  postCount: z.number().nullable(),
  commentCount: z.number().nullable(),
});

const notificationDisplayLocalgroupSchema = z.object({
  _id: z.string(),
  name: z.string().nullable(),
});

const notificationDisplayRevisionSchema = z.object({
  htmlHighlight: z.string(),
  wordCount: z.number(),
  originalContents: z.json().nullable(),
  editedAt: dateSchema.nullable(),
  userId: z.string().nullable(),
  version: z.string().nullable(),
});

const notificationDisplayPostSchema = z.object({
  _id: z.string(),
  slug: z.string(),
  title: z.string(),
  draft: z.boolean().nullable(),
  url: z.string().nullable(),
  isEvent: z.boolean(),
  eventImageId: z.string().nullable(),
  startTime: dateSchema.nullable(),
  curatedDate: dateSchema.nullable(),
  postedAt: dateSchema.nullable(),
  tags: z.never().array(),
  groupId: z.string().nullable(),
  fmCrosspost: z.json().nullable(),
  collabEditorDialogue: z.boolean().nullable(),
  readTimeMinutesOverride: z.number().nullable(),
  wordCount: z.number(),
  socialPreview: z.json().nullable(),
  socialPreviewImageAutoUrl: z.string().nullable(),
  customHighlight: z.json().nullable(),
  contents: notificationDisplayRevisionSchema.nullable(),
  rsvps: z.json().array().nullable(),
  user: notificationDisplayUserSchema.nullable(),
  group: notificationDisplayLocalgroupSchema.nullable(),
});

const notificationDisplayCommentSchema = z.object({
  _id: z.string(),
  user: notificationDisplayUserSchema.nullable(),
  post: notificationDisplayPostSchema.nullable(),
});

const notificationDisplayTagSchema = z.object({
  _id: z.string(),
  name: z.string().nullable(),
  slug: z.string().nullable(),
});

const notificationDisplaySequenceSchema = z.object({
  _id: z.string(),
  title: z.string().nullable(),
});

/** Main type for the notifications page */
export const notificationDisplaySchema = z.object({
  _id: z.string(),
  type: z.string(),
  link: z.string().nullable(),
  viewed: z.boolean(),
  message: z.string(),
  createdAt: dateSchema.nullable(),
  extraData: z.json().nullable(),
  tagRelId: z.string().nullable(),
  post: notificationDisplayPostSchema.nullable(),
  comment: notificationDisplayCommentSchema.nullable(),
  tag: notificationDisplayTagSchema.nullable(),
  sequence: notificationDisplaySequenceSchema.nullable(),
  user: notificationDisplayUserSchema.nullable(),
  localgroup: notificationDisplayLocalgroupSchema.nullable(),
});

export type NotificationDisplay = z.infer<typeof notificationDisplaySchema>;

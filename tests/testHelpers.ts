import { db } from "@/lib/db";
import {
  Comment,
  comments,
  InsertComment,
  InsertPost,
  InsertRevision,
  InsertTag,
  InsertUser,
  Post,
  posts,
  Revision,
  revisions,
  Tag,
  tags,
  User,
  users,
} from "@/lib/schema";
import { randomId } from "@/lib/utils/random";
import { slugify } from "@/lib/utils/slugify";

export const createTestUser = async (data?: Partial<InsertUser>): Promise<User> => {
  const testUsername = data?.username || data?.displayName || randomId();
  const insertValues: InsertUser = {
    _id: randomId(),
    username: testUsername,
    displayName: testUsername,
    previousDisplayName: randomId(),
    slug: slugify(testUsername),
    email: testUsername + "@effectivealtruism.org",
    reviewedByUserId: "fakeuserid",
    acceptedTos: true,
    ...data,
  };
  const result = await db.insert(users).values(insertValues).returning();
  return result[0];
};

export const createTestRevision = async (
  data?: Partial<InsertRevision>,
): Promise<Revision> => {
  const insertValues: InsertRevision = {
    _id: randomId(),
    userId: data?.userId ?? (await createTestUser())._id,
    editedAt: new Date().toISOString(),
    version: "1.0.0",
    wordCount: 0,
    changeMetrics: {},
    draft: false,
    ...data,
  };
  const result = await db.insert(revisions).values(insertValues).returning();
  return result[0];
};

export const createTestRevisionFromHtml = async (html: string, version = "1.0.0") =>
  createTestRevision({
    originalContents: {
      type: "ckEditorMarkup",
      data: html,
    },
    html,
    version,
  });

export const createTestPost = async (data?: Partial<InsertPost>): Promise<Post> => {
  const userId = data?.userId ?? (await createTestUser())._id;
  const postId = data?._id ?? randomId();
  const title = data?.title ?? randomId();
  const createdAt = data?.postedAt || data?.createdAt || new Date().toISOString();
  const revision = await createTestRevision({
    collectionName: "Posts",
    documentId: postId,
    fieldName: "contents",
    userId,
    createdAt,
  });
  const insertValues: InsertPost = {
    _id: postId,
    userId,
    title,
    slug: slugify(title),
    status: 2,
    isFuture: false,
    maxBaseScore: 0,
    contentsLatest: revision._id,
    fmCrosspost: { isCrosspost: false },
    createdAt,
    postedAt: createdAt,
    ...data,
  };
  const result = await db.insert(posts).values(insertValues).returning();
  return result[0];
};

export const createTestComment = async (
  data: Partial<InsertComment>,
): Promise<Comment> => {
  const userId = data?.userId ?? (await createTestUser())._id;
  const commentId = data?._id ?? randomId();
  const createdAt = data.postedAt || data.createdAt || new Date().toISOString();
  const revision = await createTestRevision({
    collectionName: "Comments",
    documentId: commentId,
    fieldName: "contents",
    userId,
    createdAt,
  });
  const insertValues: InsertComment = {
    _id: commentId,
    userId,
    contentsLatest: revision._id,
    contents: "",
    createdAt,
    postedAt: createdAt,
    ...data,
  };
  const result = await db.insert(comments).values(insertValues).returning();
  return result[0];
};

export const createTestTag = async (data: Partial<InsertTag>): Promise<Tag> => {
  const userId = data?.userId ?? (await createTestUser())._id;
  const tagId = data?._id ?? randomId();
  const createdAt = data.createdAt || new Date().toISOString();
  const revision = await createTestRevision({
    collectionName: "Comments",
    documentId: tagId,
    fieldName: "contents",
    userId,
    createdAt,
  });
  const insertValues: InsertTag = {
    _id: tagId,
    name: data.name ?? randomId(),
    slug: data.slug ?? randomId(),
    userId,
    descriptionLatest: revision._id,
    description: "",
    createdAt,
    ...data,
  };
  const result = await db.insert(tags).values(insertValues).returning();
  return result[0];
};

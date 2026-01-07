import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { comments, posts, sequences, tags, users } from "@/lib/schema";
import type { SearchIndexCollectionName } from "./elasticIndexes";
import type {
  SearchComment,
  SearchPost,
  SearchSequence,
  SearchTag,
  SearchUser,
} from "../searchDocuments";

const searchDocumentQueries = {
  posts: `
    SELECT
      p."_id",
      p."_id" AS "objectID",
      p."userId",
      p."url",
      p."title",
      p."slug",
      COALESCE(p."baseScore", 0) AS "baseScore",
      p."status",
      p."curatedDate" IS NOT NULL AND "curatedDate" < NOW() AS "curated",
      p."legacy",
      COALESCE(p."commentCount", 0) AS "commentCount",
      p."postedAt",
      p."createdAt",
      EXTRACT(EPOCH FROM p."postedAt") * 1000 AS "publicDateMs",
      COALESCE(p."isFuture", FALSE) AS "isFuture",
      COALESCE(p."isEvent", FALSE) AS "isEvent",
      COALESCE(p."rejected", FALSE) AS "rejected",
      COALESCE(p."authorIsUnreviewed", FALSE) AS "authorIsUnreviewed",
      COALESCE(p."unlisted", FALSE) AS "unlisted",
      COALESCE(p."viewCount", 0) AS "viewCount",
      p."lastCommentedAt",
      COALESCE(p."draft", FALSE) AS "draft",
      COALESCE(p."af", FALSE) AS "af",
      (SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
 '_id', t."_id",
        'slug', t."slug",
        'name', t."name"
      )) FROM "Tags" t WHERE
        t."_id" = ANY(fm_post_tag_ids(p."_id")) AND
        t."deleted" IS NOT TRUE
      ) AS "tags",
      CASE
        WHEN author."deleted" THEN NULL
        ELSE author."slug"
      END AS "authorSlug",
      CASE
        WHEN author."deleted" THEN NULL
        ELSE author."displayName"
      END AS "authorDisplayName",
      CASE
        WHEN author."deleted" THEN NULL
        ELSE author."fullName"
      END AS "authorFullName",
      rss."nickname" AS "feedName",
      p."feedLink",
      revision."html" AS "body",
      NOW() AS "exportedAt"
    FROM "Posts" p
    LEFT JOIN "Revisions" revision ON p."contents_latest" = revision."_id"
    LEFT JOIN "Users" author ON p."userId" = author."_id"
    LEFT JOIN "RSSFeeds" rss ON p."feedId" = rss."_id"
  `,
  comments: `
    SELECT
      c."_id",
      c."_id" AS "objectID",
      c."userId",
      COALESCE(c."baseScore", 0) AS "baseScore",
      COALESCE(c."deleted", FALSE) AS "deleted",
      COALESCE(c."draft", FALSE) AS "draft",
      COALESCE(c."rejected", FALSE) AS "rejected",
      COALESCE(c."authorIsUnreviewed", FALSE) AS "authorIsUnreviewed",
      COALESCE(c."retracted", FALSE) AS "retracted",
      COALESCE(c."spam", FALSE) AS "spam",
      c."legacy",
      c."createdAt",
      c."postedAt",
      EXTRACT(EPOCH FROM c."postedAt") * 1000 AS "publicDateMs",
      COALESCE(c."af", FALSE) AS "af",
      CASE
        WHEN author."deleted" THEN NULL
        ELSE author."slug"
      END AS "authorSlug",
      CASE
        WHEN author."deleted" THEN NULL
        ELSE author."displayName"
      END AS "authorDisplayName",
      CASE
        WHEN author."deleted" THEN NULL
        ELSE author."username"
      END AS "authorUserName",
      c."postId",
      post."title" AS "postTitle",
      post."slug" AS "postSlug",
      COALESCE(post."isEvent", FALSE) AS "postIsEvent",
      post."groupId" AS "postGroupId",
      fm_post_tag_ids(post."_id") AS "tags",
      CASE WHEN c."tagId" IS NULL
        THEN fm_post_tag_ids(post."_id")
        ELSE ARRAY(SELECT c."tagId")
      END AS "tags",
      c."tagId",
      tag."name" AS "tagName",
      tag."slug" AS "tagSlug",
      c."tagCommentType",
      c."contents"->>'html' AS "body",
      NOW() AS "exportedAt"
    FROM "Comments" c
    LEFT JOIN "Users" author ON c."userId" = author."_id"
    LEFT JOIN "Posts" post on c."postId" = post."_id"
    LEFT JOIN "Tags" tag on c."tagId" = tag."_id"
  `,
  sequences: `
    SELECT
      s."_id",
      s."_id" AS "objectID",
      s."title",
      s."userId",
      s."createdAt",
      EXTRACT(EPOCH FROM s."createdAt") * 1000 AS "publicDateMs",
      COALESCE(s."isDeleted", FALSE) AS "isDeleted",
      COALESCE(s."draft", FALSE) AS "draft",
      COALESCE(s."hidden", FALSE) AS "hidden",
      COALESCE(s."af", FALSE) AS "af",
      s."bannerImageId",
      CASE
        WHEN author."deleted" THEN NULL
        ELSE author."slug"
      END AS "authorSlug",
      CASE
        WHEN author."deleted" THEN NULL
        ELSE author."displayName"
      END AS "authorDisplayName",
      CASE
        WHEN author."deleted" THEN NULL
        ELSE author."username"
      END AS "authorUserName",
      s."contents"->>'html' AS "plaintextDescription",
      NOW() AS "exportedAt"
    FROM "Sequences" s
    LEFT JOIN "Users" author on s."userId" = author."_id"
  `,
  users: `
    SELECT
      u."_id",
      u."_id" AS "objectID",
      u."username",
      u."displayName",
      u."createdAt",
      EXTRACT(EPOCH FROM u."createdAt") * 1000 AS "publicDateMs",
      COALESCE(u."isAdmin", FALSE) AS "isAdmin",
      COALESCE(u."deleted", FALSE) AS "deleted",
      COALESCE(u."deleteContent", FALSE) AS "deleteContent",
      COALESCE(u."hideFromPeopleDirectory", FALSE) AS "hideFromPeopleDirectory",
      u."profileImageId",
      u."biography"->>'html' AS "bio",
      u."howOthersCanHelpMe"->>'html' AS "howOthersCanHelpMe",
      u."howICanHelpOthers"->>'html' AS "howICanHelpOthers",
      COALESCE(u."karma", 0) AS "karma",
      COALESCE(u."commentCount", 0) AS "commentCount",
      u."slug",
      NULLIF(TRIM(u."jobTitle"), '') AS "jobTitle",
      NULLIF(TRIM(u."organization"), '') AS "organization",
      u."careerStage",
      NULLIF(TRIM(u."website"), '') AS "website",
      u."groups",
      u."groups" @> ARRAY['alignmentForum'] AS "af",
      (SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
        '_id', t."_id",
        'slug', t."slug",
        'name', t."name"
      )) FROM "Tags" t WHERE
        t."_id" = ANY(u."profileTagIds") AND
        t."deleted" IS NOT TRUE
      ) AS "tags",
      (SELECT ARRAY_AGG(JSONB_BUILD_OBJECT(
        '_id', p."_id",
        'slug', p."slug",
        'title', p."title"
      ) ORDER BY p."baseScore" DESC) FROM "Posts" p WHERE
        p."userId" = u."_id" AND
        p."shortform" IS NOT TRUE AND
        p."status" = 2 AND
        p."draft" = FALSE AND
        p."deletedDraft" = FALSE AND
        p."isFuture" = FALSE AND
        p."unlisted" = FALSE AND
        p."shortform" = FALSE AND
        p."authorIsUnreviewed" = FALSE AND
        p."hiddenRelatedQuestion" = FALSE AND
        p."isEvent" = FALSE AND
        p."postedAt" IS NOT NULL
      ) AS "posts",
      NULLIF(JSONB_STRIP_NULLS(JSONB_BUILD_OBJECT(
        'website', NULLIF(TRIM(u."website"), ''),
        'github', NULLIF(TRIM(u."githubProfileURL"), ''),
        'bluesky', NULLIF(TRIM(u."blueskyProfileURL"), ''),
        'twitter', NULLIF(TRIM(u."twitterProfileURL"), ''),
        'linkedin', NULLIF(TRIM(u."linkedinProfileURL"), ''),
        'facebook', NULLIF(TRIM(u."facebookProfileURL"), '')
      )), '{}') AS "socialMediaUrls",
      CASE WHEN u."mapLocation"->'geometry'->'location' IS NULL THEN NULL ELSE
        JSONB_BUILD_OBJECT(
          'type', 'point',
          'coordinates', JSONB_BUILD_ARRAY(
            u."mapLocation"->'geometry'->'location'->'lng',
            u."mapLocation"->'geometry'->'location'->'lat'
        )) END AS "_geoloc",
      u."mapLocation"->'formatted_address' AS "mapLocationAddress",
      u."profileUpdatedAt",
      (
        CASE WHEN u."profileImageId" IS NULL THEN 0 ELSE 1 END +
        CASE WHEN u."jobTitle" IS NULL THEN 0 ELSE 1 END +
        CASE WHEN u."organization" IS NULL THEN 0 ELSE 1 END +
        CASE WHEN u."biography"->>'html' IS NULL THEN 0 ELSE 1 END +
        CASE WHEN u."howOthersCanHelpMe"->>'html' IS NULL THEN 0 ELSE 1 END +
        CASE WHEN u."howICanHelpOthers"->>'html' IS NULL THEN 0 ELSE 1 END +
        CASE WHEN u."careerStage" IS NULL THEN 0 ELSE 1 END +
        CASE WHEN u."website" IS NULL THEN 0 ELSE 0.25 END +
        CASE WHEN u."githubProfileURL" IS NULL THEN 0 ELSE 0.25 END +
        CASE WHEN u."blueskyProfileURL" IS NULL THEN 0 ELSE 0.25 END +
        CASE WHEN u."twitterProfileURL" IS NULL THEN 0 ELSE 0.25 END +
        CASE WHEN u."linkedinProfileURL" IS NULL THEN 0 ELSE 0.25 END +
        CASE WHEN u."facebookProfileURL" IS NULL THEN 0 ELSE 0.25 END +
        CASE WHEN u."mapLocation"->'geometry'->'location' IS NULL THEN 0 ELSE 1 END +
        CASE WHEN u."commentCount" < 1 THEN 0 ELSE 1 END +
        CASE WHEN u."postCount" < 1 THEN 0 ELSE 2 END +
        CASE WHEN u."karma" IS NULL OR u."karma" <= 0 THEN 0 ELSE 1 - 1 / u."karma" END * 100
      ) AS "profileCompletion",
      NOW() AS "exportedAt"
    FROM "Users" u
  `,
  tags: `
    SELECT
      t."_id",
      t."_id" AS "objectID",
      t."name",
      t."slug",
      COALESCE(t."core", FALSE) AS "core",
      EXTRACT(EPOCH FROM t."createdAt") * 1000 AS "publicDateMs",
      COALESCE(t."defaultOrder", 0) AS "defaultOrder",
      COALESCE(t."suggestedAsFilter", FALSE) AS "suggestedAsFilter",
      COALESCE(t."baseScore", 0) AS "baseScore",
      COALESCE(t."postCount", 0) AS "postCount",
      COALESCE(t."wikiOnly", FALSE) AS "wikiOnly",
      COALESCE(t."adminOnly", FALSE) AS "adminOnly",
      COALESCE(t."deleted", FALSE) AS "deleted",
      COALESCE(t."isSubforum", FALSE) AS "isSubforum",
      t."isPlaceholderPage" AS "isPlaceholderPage",
      t."bannerImageId",
      t."parentTagId",
      t."description"->>'html' AS "description",
      NOW() AS "exportedAt"
    FROM "Tags" t
  `,
};

const fetchSearchPostById = async (id: string) => {
  const result = await db.execute<SearchPost>(sql`
    -- fetchSearchPostById
    ${sql.raw(searchDocumentQueries.posts)}
    WHERE p."_id" = ${id}
  `);
  return result.rows[0] ?? null;
};

const fetchSearchPosts = async (limit: number, offset: number) => {
  const result = await db.execute<SearchPost>(sql`
    -- fetchSearchPosts
    ${sql.raw(searchDocumentQueries.posts)}
    ORDER BY p."createdAt" DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);
  return result.rows;
};

const countSearchPosts = () => db.$count(posts);

const fetchSearchCommentById = async (id: string) => {
  const result = await db.execute<SearchComment>(sql`
    -- fetchSearchCommentById
    ${sql.raw(searchDocumentQueries.comments)}
    WHERE c."_id" = ${id}
  `);
  return result.rows[0] ?? null;
};

const fetchSearchComments = async (limit: number, offset: number) => {
  const result = await db.execute<SearchComment>(sql`
    -- fetchSearchComments
    ${sql.raw(searchDocumentQueries.comments)}
    ORDER BY c."createdAt" DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);
  return result.rows;
};

const countSearchComments = () => db.$count(comments);

const fetchSearchSequenceById = async (id: string) => {
  const result = await db.execute<SearchSequence>(sql`
    -- fetchSearchSequenceById
    ${sql.raw(searchDocumentQueries.sequences)}
    WHERE s."_id" = ${id}
  `);
  return result.rows[0] ?? null;
};

const fetchSearchSequences = async (limit: number, offset: number) => {
  const result = await db.execute<SearchSequence>(sql`
    -- fetchSearchSequences
    ${sql.raw(searchDocumentQueries.sequences)}
    ORDER BY s."createdAt" DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);
  return result.rows;
};

const countSearchSequences = () => db.$count(sequences);

const fetchSearchUserById = async (id: string) => {
  const result = await db.execute<SearchUser>(sql`
    -- fetchSearchUserById
    ${sql.raw(searchDocumentQueries.users)}
    WHERE u."_id" = ${id} AND u."displayName" IS NOT NULL
  `);
  return result.rows[0] ?? null;
};

const fetchSearchUsers = async (limit: number, offset: number) => {
  const result = await db.execute<SearchUser>(sql`
    -- fetchSearchUsers
    ${sql.raw(searchDocumentQueries.users)}
    WHERE u."displayName" IS NOT NULL
    ORDER BY u."createdAt" DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);
  return result.rows;
};

const countSearchUsers = () => db.$count(users);

const fetchSearchTagById = async (id: string) => {
  const result = await db.execute<SearchTag>(sql`
    -- fetchSearchTagById
    ${sql.raw(searchDocumentQueries.tags)}
    WHERE t."_id" = ${id}
  `);
  return result.rows[0] ?? null;
};

const fetchSearchTags = async (limit: number, offset: number) => {
  const result = await db.execute<SearchTag>(sql`
    -- fetchSearchTags
    ${sql.raw(searchDocumentQueries.tags)}
    ORDER BY t."createdAt" DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);
  return result.rows;
};

const countSearchTags = () => db.$count(tags);

export const getSearchRepoByCollectionName = (
  collectionName: SearchIndexCollectionName,
) => {
  switch (collectionName) {
    case "Posts":
      return {
        fetchById: fetchSearchPostById,
        fetchAll: fetchSearchPosts,
        count: countSearchPosts,
      };
    case "Comments":
      return {
        fetchById: fetchSearchCommentById,
        fetchAll: fetchSearchComments,
        count: countSearchComments,
      };
    case "Users":
      return {
        fetchById: fetchSearchUserById,
        fetchAll: fetchSearchUsers,
        count: countSearchUsers,
      };
    case "Sequences":
      return {
        fetchById: fetchSearchSequenceById,
        fetchAll: fetchSearchSequences,
        count: countSearchSequences,
      };
    case "Tags":
      return {
        fetchById: fetchSearchTagById,
        fetchAll: fetchSearchTags,
        count: countSearchTags,
      };
    default:
      throw new Error(`Can't create repo for collection ${collectionName}`);
  }
};

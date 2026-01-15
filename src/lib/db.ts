import "server-only";
import { isAnyTest } from "./environment";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as pgDrizzle } from "drizzle-orm/node-postgres";
import { drizzle as pgLiteDrizzle } from "drizzle-orm/pglite";
import { btree_gin } from "@electric-sql/pglite/contrib/btree_gin";
import { earthdistance } from "@electric-sql/pglite/contrib/earthdistance";
import { intarray } from "@electric-sql/pglite/contrib/intarray";
import { vector } from "@electric-sql/pglite/vector";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { cube } from "@electric-sql/pglite/contrib/cube";
import { defineRelations } from "drizzle-orm";
import {
  comments,
  forumEvents,
  images,
  localgroups,
  lwEvents,
  moderatorActions,
  posts,
  readStatuses,
  revisions,
  tags,
  userLoginTokens,
  userRateLimits,
  users,
  votes,
} from "./schema";

const relations = defineRelations(
  {
    users,
    posts,
    readStatuses,
    comments,
    revisions,
    votes,
    localgroups,
    tags,
    images,
    lwEvents,
    forumEvents,
    moderatorActions,
    userRateLimits,
    userLoginTokens,
  },
  (r) => ({
    posts: {
      user: r.one.users({
        from: r.posts.userId,
        to: r.users._id,
      }),
      contents: r.one.revisions({
        from: r.posts.contentsLatest,
        to: r.revisions._id,
      }),
      group: r.one.localgroups({
        from: r.posts.groupId,
        to: r.localgroups._id,
      }),
      readStatus: r.many.readStatuses({
        from: r.posts._id,
        to: r.readStatuses.postId,
      }),
      comments: r.many.comments({
        from: r.posts._id,
        to: r.comments.postId,
      }),
    },
    comments: {
      user: r.one.users({
        from: r.comments.userId,
        to: r.users._id,
      }),
      votes: r.many.votes({
        from: r.comments._id,
        to: r.votes.documentId,
        where: {
          collectionName: { eq: "Comments" },
          cancelled: { eq: false },
          isUnvote: { eq: false },
        },
      }),
    },
    userLoginTokens: {
      user: r.one.users({
        from: r.userLoginTokens.userId,
        to: r.users._id,
      }),
    },
  }),
);

if (!process.env.DATABASE_URL && !isAnyTest()) {
  throw new Error("Postgres URL is not configured");
}

export const db = isAnyTest()
  ? pgLiteDrizzle({
      relations,
      logger: process.env.LOG_DRIZZLE_QUERIES === "true",
      // We supply a custom client here with extensions. Note this just makes the
      // extensions _available_ - we still have to manually install them. Some
      // extensions (such as cube) are not used directly, but are dependencies of
      // other needed extensions.
      // For available extensions see https://pglite.dev/extensions.
      client: new PGlite({
        extensions: {
          btree_gin,
          earthdistance,
          intarray,
          vector,
          pg_trgm,
          cube,
        },
      }),
    })
  : pgDrizzle(process.env.DATABASE_URL, {
      relations,
      logger: process.env.LOG_DRIZZLE_QUERIES === "true",
    });

export type Db = typeof db;

/**
 * When creating a database transaction with `db.transaction` we're passed a
 * transaction object to use instead of `db`. This is a helper type so that we
 * can easily pass that transaction to other functions without neededing to
 * worry about the complex generic types resuling from our schema.
 * When taking this as a function argument, it's often more ergonomic to use
 * `DbOrTransaction` below, since both objects offer the same API.
 */
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Either a raw database connection or a database transaction */
export type DbOrTransaction = Db | Transaction;

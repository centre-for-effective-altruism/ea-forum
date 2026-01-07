import "server-only";
import { isAnyTest } from "./environment";
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
  localgroups,
  posts,
  revisions,
  tags,
  userLoginTokens,
  users,
  votes,
} from "./schema";
import { PGlite } from "@electric-sql/pglite";

const relations = defineRelations(
  { users, posts, comments, revisions, votes, localgroups, tags, userLoginTokens },
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

import { sql } from "kysely";
import { getDbOrThrow, RepoQuery } from "../db";
import { nDaysAgo } from "../timeUtils";

export type PostsList = RepoQuery<PostsRepo, "getFrontpagePostsList">;
export type SidebarOpportunity = RepoQuery<PostsRepo, "getSidebarOpportunities">;
export type SidebarEvent = RepoQuery<PostsRepo, "getSidebarEvents">;

export class PostsRepo {
  private static readonly defaultScoreBias = 2;
  private static readonly defaultTimeDecayFactor = 0.8;

  constructor(private db = getDbOrThrow()) {}

  getFrontpagePostsList({
    limit,
    scoreBias = PostsRepo.defaultScoreBias,
    timeDecayFactor = PostsRepo.defaultTimeDecayFactor,
  }: {
    limit: number;
    scoreBias?: number;
    timeDecayFactor?: number;
  }) {
    return this.db
      .selectFrom("Posts")
      .modifyEnd(sql`-- PostsRepo.getFrontpagePostsList`)
      .where(({ eb, and, not }) =>
        and([
          not("isEvent"),
          not("sticky"),
          not("draft"),
          not("isFuture"),
          not("unlisted"),
          not("shortform"),
          not("rejected"),
          not("hiddenRelatedQuestion"),
          eb("status", "=", 2),
          eb("groupId", "is", null),
          eb("frontpageDate", ">", new Date(0)),
          eb("postedAt", ">", nDaysAgo(21)),
        ]),
      )
      .orderBy("sticky", "desc")
      .orderBy("stickyPriority", "desc")
      .orderBy(
        sql`
        (
          "baseScore"
            + (CASE WHEN "frontpageDate" IS NOT NULL THEN 10 ELSE 0 END)
            + (CASE WHEN "curatedDate" IS NOT NULL THEN 10 ELSE 0 END)
        ) / POW(
          EXTRACT(EPOCH FROM NOW() - "postedAt") / 3600000 + ${scoreBias},
          ${timeDecayFactor}
        )
      `,
        "desc",
      )
      .orderBy("_id", "desc")
      .limit(limit)
      .select([
        "_id",
        "slug",
        "title",
        "baseScore",
        "voteCount",
        "commentCount",
        "postedAt",
        "curatedDate",
        "isEvent",
        "groupId",
        "sticky",
      ])
      .execute();
  }

  getSidebarOpportunities({
    limit,
    scoreBias = PostsRepo.defaultScoreBias,
    timeDecayFactor = PostsRepo.defaultTimeDecayFactor,
  }: {
    limit: number;
    scoreBias?: number;
    timeDecayFactor?: number;
  }) {
    return this.db
      .selectFrom("Posts")
      .modifyEnd(sql`-- PostsRepo.getSidebarOpportunities`)
      .where(({ eb, and, not }) =>
        and([
          not("isEvent"),
          not("sticky"),
          not("draft"),
          not("isFuture"),
          not("unlisted"),
          not("shortform"),
          not("rejected"),
          not("authorIsUnreviewed"),
          not("hiddenRelatedQuestion"),
          eb("status", "=", 2),
          eb("groupId", "is", null),
          eb("frontpageDate", ">", new Date(0)),
          eb("postedAt", ">", nDaysAgo(21)),
          eb(sql`("tagRelevance"->'z8qFsGt5iXyZiLbjN')::INTEGER`, ">=", 1),
        ]),
      )
      .orderBy("sticky", "desc")
      .orderBy("stickyPriority", "desc")
      .orderBy(
        sql`
        (
          "baseScore"
            + (CASE WHEN "frontpageDate" IS NOT NULL THEN 10 ELSE 0 END)
            + (CASE WHEN "curatedDate" IS NOT NULL THEN 10 ELSE 0 END)
        ) / POW(
          EXTRACT(EPOCH FROM NOW() - "postedAt") / 3600000 + ${scoreBias},
          ${timeDecayFactor}
        )
      `,
        "desc",
      )
      .orderBy("_id", "desc")
      .limit(limit)
      .select(["_id", "slug", "title", "postedAt", "isEvent", "groupId"])
      .execute();
  }

  getSidebarEvents({ limit }: { limit: number }) {
    return this.db
      .selectFrom("Posts")
      .modifyEnd(sql`-- PostsRepo.getSidebarEvents`)
      .where(({ eb, and, not }) =>
        and([
          eb("isEvent", "is", true),
          not("sticky"),
          not("draft"),
          not("isFuture"),
          not("unlisted"),
          not("shortform"),
          not("rejected"),
          not("authorIsUnreviewed"),
          not("hiddenRelatedQuestion"),
          eb("status", "=", 2),
          eb("startTime", ">", new Date()),
        ]),
      )
      .orderBy("startTime", "asc")
      .orderBy("baseScore", "desc")
      .orderBy("_id", "desc")
      .limit(limit)
      .select([
        "_id",
        "slug",
        "title",
        "startTime",
        "onlineEvent",
        "googleLocation",
        "isEvent",
        "groupId",
      ])
      .execute();
  }
}

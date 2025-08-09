import { expressionBuilder, sql } from "kysely";
import { jsonBuildObject } from "kysely/helpers/postgres";
import { getDbOrThrow, RepoQuery } from "../db";
import { nDaysAgo } from "../timeUtils";
import { DB, Posts, Users } from "../dbTypes";

export type PostsListItem = RepoQuery<PostsRepo, "getFrontpagePostsList">;
export type SidebarOpportunity = RepoQuery<PostsRepo, "getSidebarOpportunities">;
export type SidebarEvent = RepoQuery<PostsRepo, "getSidebarEvents">;

export class PostsRepo {
  private static readonly defaultScoreBias = 2;
  private static readonly defaultTimeDecayFactor = 0.8;

  constructor(private db = getDbOrThrow()) {}

  private getViewablePostFilter<
    Tb extends string,
    Db extends DB & Record<Tb, Posts>,
  >(alias: Tb, { includeEvents }: { includeEvents?: boolean } = {}) {
    const { eb, and, not, lit } = expressionBuilder<Db, Tb>();
    return and([
      ...(includeEvents ? [not(`${alias}.isEvent`)] : []),
      not(`${alias}.draft`),
      not(`${alias}.deletedDraft`),
      not(`${alias}.isFuture`),
      not(`${alias}.unlisted`),
      not(`${alias}.shortform`),
      not(`${alias}.rejected`),
      not(`${alias}.authorIsUnreviewed`),
      not(`${alias}.hiddenRelatedQuestion`),
      eb(`${alias}.postedAt`, "is not", null),
      // @ts-expect-error - I don't know why this is a type error, but it works
      eb(`${alias}.status`, "=", lit(2)),
    ]);
  }

  getUserDisplaySelector<Tb extends string, Db extends DB & Record<Tb, Users>>(
    alias: Tb,
  ) {
    const { ref } = expressionBuilder<Db, Tb>();
    return jsonBuildObject({
      _id: ref(`${alias}._id`),
      slug: ref(`${alias}.slug`),
      displayName: ref(`${alias}.displayName`),
      createdAt: ref(`${alias}.createdAt`),
      profileImageId: ref(`${alias}.profileImageId`),
      karma: ref(`${alias}.karma`),
      jobTitle: ref(`${alias}.jobTitle`),
      organization: ref(`${alias}.organization`),
      postCount: ref(`${alias}.postCount`),
      commentCount: ref(`${alias}.commentCount`),
    });
  }

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
      .selectFrom("Posts as p")
      .modifyEnd(sql`-- PostsRepo.getFrontpagePostsList`)
      .leftJoin("Users as u", "u._id", "p.userId")
      .leftJoin("Users as coauthors", (join) =>
        join.on(({ eb, fn }) =>
          eb("coauthors._id", "=", fn.any("p.coauthorUserIds")),
        ),
      )
      .where(({ eb, and, not }) =>
        and([
          this.getViewablePostFilter("p"),
          not("p.sticky"),
          eb("p.groupId", "is", null),
          eb("p.frontpageDate", ">", new Date(0)),
          eb("p.postedAt", ">", nDaysAgo(21)),
        ]),
      )
      .groupBy("p._id")
      .groupBy("u._id")
      .orderBy("p.sticky", "desc")
      .orderBy("p.stickyPriority", "desc")
      .orderBy(
        sql`
        (
          p."baseScore"
            + (CASE WHEN p."frontpageDate" IS NOT NULL THEN 10 ELSE 0 END)
            + (CASE WHEN p."curatedDate" IS NOT NULL THEN 10 ELSE 0 END)
        ) / POW(
          EXTRACT(EPOCH FROM NOW() - p."postedAt") / 3600000 + ${scoreBias},
          ${timeDecayFactor}
        )
      `,
        "desc",
      )
      .orderBy("p._id", "desc")
      .limit(limit)
      .select([
        "p._id",
        "p.slug",
        "p.title",
        "p.baseScore",
        "p.voteCount",
        "p.commentCount",
        "p.postedAt",
        "p.curatedDate",
        "p.isEvent",
        "p.groupId",
        "p.sticky",
        this.getUserDisplaySelector("u").as("user"),
        sql`array_agg(${this.getUserDisplaySelector("coauthors")})`.as("coauthors"),
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
          this.getViewablePostFilter("Posts"),
          not("sticky"),
          eb("groupId", "is", null),
          eb("frontpageDate", ">", new Date(0)),
          eb("postedAt", ">", nDaysAgo(21)),
          // Opportunities to take action tag
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
      .where(({ eb, and }) =>
        and([
          this.getViewablePostFilter("Posts", { includeEvents: true }),
          eb("isEvent", "is", true),
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

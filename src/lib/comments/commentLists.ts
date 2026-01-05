import { arrayContains, sql } from "drizzle-orm";
import { comments, db, isNotTrue } from "@/lib/schema";
import { nDaysAgo, nHoursAgo } from "@/lib/timeUtils";

export type CommentsList = Awaited<ReturnType<typeof fetchCommentsList>>[number];

type CommentsFilter = NonNullable<
  Parameters<typeof db.query.comments.findMany>[0]
>["where"];

type CommentsOrderBy = NonNullable<
  Parameters<typeof db.query.comments.findMany>[0]
>["orderBy"];

const fetchCommentsList = ({
  where,
  orderBy,
  limit,
}: {
  where?: CommentsFilter;
  orderBy?: CommentsOrderBy;
  limit?: number;
}) => {
  return db.query.comments.findMany({
    columns: {
      _id: true,
      postedAt: true,
      baseScore: true,
      voteCount: true,
      parentCommentId: true,
      topLevelCommentId: true,
      descendentCount: true,
      deleted: true,
    },
    extras: {
      html: sql<string>`contents->>'html'`.as("html"),
    },
    with: {
      user: {
        columns: {
          _id: true,
          slug: true,
          displayName: true,
          createdAt: true,
          profileImageId: true,
          karma: true,
          jobTitle: true,
          organization: true,
          postCount: true,
          commentCount: true,
          biography: true,
        },
        where: {
          deleted: isNotTrue,
        },
      },
    },
    where: {
      rejected: isNotTrue,
      debateResponse: isNotTrue,
      authorIsUnreviewed: isNotTrue,
      ...where,
    },
    orderBy,
    limit,
  });
};

export const fetchCommmentsForPost = (postId: string) =>
  fetchCommentsList({
    where: { postId },
  });

export const fetchFrontpageQuickTakes = ({
  currentUserId,
  includeCommunity,
  relevantTagId,
  limit = 5,
}: {
  currentUserId: string | null;
  includeCommunity?: boolean;
  relevantTagId?: string;
  limit?: number;
}) => {
  const fiveDaysAgo = nDaysAgo(5).toISOString();
  const twoHoursAgo = nHoursAgo(2).toISOString();
  const communityFilter =
    includeCommunity && process.env.COMMUNITY_TAG_ID
      ? arrayContains(comments.relevantTagIds, [process.env.COMMUNITY_TAG_ID])
      : undefined;
  const tagFilter = relevantTagId
    ? arrayContains(comments.relevantTagIds, [relevantTagId])
    : undefined;
  return fetchCommentsList({
    where: {
      shortform: true,
      shortformFrontpage: true,
      deleted: isNotTrue,
      parentCommentId: { isNull: true },
      createdAt: { gt: fiveDaysAgo },
      ...communityFilter,
      ...tagFilter,
      AND: [
        {
          OR: [
            { authorIsUnreviewed: isNotTrue },
            { userId: currentUserId ? { eq: currentUserId } : undefined },
          ],
        },
        // Quick takes older than 2 hours must have at least 1 karma, quick takes
        // younger than 2 hours must have at least -5 karma
        {
          OR: [
            {
              baseScore: { gte: 1 },
              createdAt: { lt: twoHoursAgo },
            },
            {
              baseScore: { gte: -5 },
              createdAt: { gte: twoHoursAgo },
            },
          ],
        },
      ],
    },
    orderBy: {
      score: "desc",
      lastSubthreadActivity: "desc",
      postedAt: "desc",
      _id: "desc",
    },
    limit,
  });
};

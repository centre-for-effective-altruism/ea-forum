import "server-only";

import { db } from "../db";
import { fetchTagBySlug } from "../tags/tagQueries";
import {
  marginalFundingWeekSequenceId,
  marginalFundingWeekTagSlug,
} from "../marginalFundingWeek";
import {
  onlyTagFilter,
  sequenceViewablePostFilter,
  type PostFromProjection,
  type PostRelationalProjection,
} from "../posts/postLists";

const marginalFundingWeekAdminPostProjection = {
  columns: {
    _id: true,
    slug: true,
    title: true,
    baseScore: true,
    postedAt: true,
    draft: true,
  },
  with: {
    user: {
      columns: { displayName: true },
    },
  },
} as const satisfies PostRelationalProjection;

export type MarginalFundingWeekAdminPost = PostFromProjection<
  typeof marginalFundingWeekAdminPostProjection
>;

const fetchMarginalFundingWeekSequencePostIds = async () => {
  const chapter = await db.query.chapters.findFirst({
    columns: { postIds: true },
    where: { sequenceId: marginalFundingWeekSequenceId },
  });
  return chapter?.postIds ?? [];
};

export const fetchMarginalFundingWeekAdminData = async () => {
  const [tag, sequencePostIds] = await Promise.all([
    fetchTagBySlug(marginalFundingWeekTagSlug),
    fetchMarginalFundingWeekSequencePostIds(),
  ]);
  const posts = await db.query.posts.findMany({
    ...marginalFundingWeekAdminPostProjection,
    where: {
      OR: [
        { _id: { in: sequencePostIds } },
        ...(tag
          ? [{ ...sequenceViewablePostFilter, RAW: onlyTagFilter(tag._id) }]
          : []),
      ],
    },
    orderBy: { postedAt: "desc" },
  });
  return { tagFound: !!tag, sequencePostIds, posts };
};

export type MarginalFundingWeekAdminData = Awaited<
  ReturnType<typeof fetchMarginalFundingWeekAdminData>
>;

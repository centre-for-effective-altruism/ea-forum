import { sql } from "drizzle-orm";
import { db } from "../db";
import type { CurrentUser } from "../users/currentUser";
import RecommendationStrategy, {
  RecommendationResult,
  StrategySpecification,
} from "./RecommendationStrategy";

/**
 * A recommendation strategy that returns more posts sharing a common tag. To choose
 * which tag to use we look at the source post and choose the most relevant tag that
 * has at least `minTagPostCount` posts. In the event of a tie, we choose the
 * contender with the _least_ number of posts as this tends to lead to more
 * interesting results.
 *
 * It is not uncommon for a post to have no tags with these criteria in which case
 * an error will be thrown, so this should always be used in conjuction with another
 * more reliable fallback strategy.
 */
class MoreFromTagStrategy extends RecommendationStrategy {
  constructor(private minTagPostCount = 10) {
    super();
  }

  async recommend(
    currentUser: CurrentUser | null,
    count: number,
    { postId }: StrategySpecification,
  ): Promise<RecommendationResult> {
    const tag = await this.chooseTagForPost(postId);
    if (!tag) {
      throw new Error("Couldn't choose a relevant tag for post " + postId);
    }
    const postIds = await this.recommendDefaultWithPostFilter(
      currentUser,
      count,
      postId,
      sql`("p"."tagRelevance"->${tag._id})::INTEGER >= 1`,
    );
    return { postIds, settings: { postId } };
  }

  private async chooseTagForPost(postId: string): Promise<{ _id: string } | null> {
    const result = await db.execute<{ _id: string }>(sql`
      SELECT t."_id" FROM "Tags" t
      JOIN "Posts" p ON p."_id" = ${postId}
      WHERE
        t."_id" IN (SELECT JSONB_OBJECT_KEYS(p."tagRelevance")) AND
        t."postCount" >= ${this.minTagPostCount}
      ORDER BY p."tagRelevance"->t."_id" DESC, t."postCount" ASC
      LIMIT 1
    `);
    return result.rows[0] ?? null;
  }
}

export default MoreFromTagStrategy;

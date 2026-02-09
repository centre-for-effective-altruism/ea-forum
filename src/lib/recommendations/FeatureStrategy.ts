import { SQL, sql } from "drizzle-orm";
import { db } from "../db";
import type { CurrentUser } from "../users/currentUser";
import type { Post } from "../schema";
import { featureRegistry } from "./Feature";
import RecommendationStrategy, {
  RecommendationResult,
  StrategySpecification,
} from "./RecommendationStrategy";

type FeatureStrategyOptions = {
  publishedAfter: Date;
  publishedBefore: Date;
};

/**
 * The feature strategy can be used to combine multiple composable "features" that
 * contribute to a score. Features should extend the `Feature` abstract class and
 * should return a score between 0 and 1 that can then be multiplied by a weight
 * when sorting results.
 */
class FeatureStrategy extends RecommendationStrategy {
  async recommend(
    currentUser: CurrentUser | null,
    count: number,
    { postId, features }: StrategySpecification,
    options?: Partial<FeatureStrategyOptions>,
  ): Promise<RecommendationResult> {
    if (!features) {
      throw new Error("No features supplied to FeatureStrategy");
    }

    const readFilter = this.getAlreadyReadFilter(currentUser);
    const recommendedFilter = this.getAlreadyRecommendedFilter(currentUser);
    const postFilter = this.getDefaultPostFilter();
    const tagFilter = this.getTagFilter();

    const joins: SQL[] = [];
    const filters: SQL[] = [];
    const scores: SQL[] = [];

    if (options?.publishedAfter) {
      filters.push(sql`p."postedAt" > $(publishedAfter)`);
    }
    if (options?.publishedBefore) {
      filters.push(sql`p."postedAt" < $(publishedBefore)`);
    }

    for (const { feature: featureName, weight } of features) {
      if (weight === 0) {
        continue;
      }
      const feature = new featureRegistry[featureName](currentUser, postId);
      const featureJoin = feature.getJoin();
      if (featureJoin) {
        joins.push(featureJoin);
      }
      const featureFilter = feature.getFilter();
      if (featureFilter) {
        filters.push(featureFilter);
      }
      const featureScore = feature.getScore();
      if (featureScore) {
        scores.push(sql`(${weight} * (${featureScore})::FLOAT)`);
      }
    }

    const posts = await db.execute<Post>(sql`
      -- ${sql.raw(this.constructor.name)}
      SELECT p.*
      FROM (
        SELECT p."_id", MAX(${sql.join(scores, sql`+`)}) as max_score
        FROM "Posts" p
        ${readFilter.join}
        ${postFilter.join}
        ${sql.join(joins, sql` `)}
        WHERE
          p."_id" <> ${postId} AND
          ${sql.join(filters, sql` AND `)}
          ${readFilter.filter}
          ${postFilter.filter}
          ${tagFilter.filter}
        GROUP BY p."_id"
        ORDER BY max_score DESC
        LIMIT ${count} * 10
      ) ranked_posts
      JOIN "Posts" p ON p."_id" = ranked_posts."_id"
      ${recommendedFilter.join}
      WHERE ${recommendedFilter.filter} 1=1
      ORDER BY ranked_posts.max_score DESC
      LIMIT ${count}
    `);

    return {
      posts: posts.rows,
      settings: { postId, features },
    };
  }
}

export default FeatureStrategy;

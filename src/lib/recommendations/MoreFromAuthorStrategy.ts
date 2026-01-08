import { sql } from "drizzle-orm";
import { db } from "../db";
import type { CurrentUser } from "../users/currentUser";
import type { Post } from "../schema";
import RecommendationStrategy, {
  RecommendationResult,
  StrategySpecification,
} from "./RecommendationStrategy";

/**
 * A recommendation strategy that returns more posts by the same author.
 */
class MoreFromAuthorStrategy extends RecommendationStrategy {
  async recommend(
    _currentUser: CurrentUser | null,
    count: number,
    { postId }: StrategySpecification,
  ): Promise<RecommendationResult> {
    const postFilter = this.getDefaultPostFilter();
    const posts = await db.execute<Post>(sql`
      SELECT p.*
      FROM "Posts" p
      JOIN "Posts" src ON src."_id" = ${postId}
      ${postFilter.join}
      WHERE
        ${postFilter.filter}
        p."_id" <> ${postId} AND
        (p."userId" = src."userId" OR src."userId" = ANY(p."coauthorUserIds"))
      ORDER BY p."score" DESC
      LIMIT ${count}
    `);
    return {
      posts: posts.rows,
      settings: { postId },
    };
  }
}

export default MoreFromAuthorStrategy;

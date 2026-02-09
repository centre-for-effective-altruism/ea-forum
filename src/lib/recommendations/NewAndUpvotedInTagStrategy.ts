import { sql } from "drizzle-orm";
import type { CurrentUser } from "../users/currentUser";
import RecommendationStrategy, {
  RecommendationResult,
  StrategySpecification,
} from "./RecommendationStrategy";

/**
 * A recommendation strategy that returns more posts sharing a common tag.
 */
class NewAndUpvotedInTagStrategy extends RecommendationStrategy {
  constructor() {
    super();
  }

  async recommend(
    currentUser: CurrentUser | null,
    count: number,
    { postId, tagId }: StrategySpecification,
  ): Promise<RecommendationResult> {
    if (!tagId) {
      throw new Error("No tag id provided");
    }
    const postIds = await this.recommendDefaultWithPostFilter(
      currentUser,
      count,
      postId,
      sql`
        (p."tagRelevance"->${tagId})::INTEGER >= 1 AND
        (NOW() - p."createdAt") < '3 months'
      `,
    );
    return {
      postIds,
      settings: { postId, tagId },
    };
  }
}

export default NewAndUpvotedInTagStrategy;

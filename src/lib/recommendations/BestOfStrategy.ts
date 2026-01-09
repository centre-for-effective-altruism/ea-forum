import type { CurrentUser } from "../users/currentUser";
import type {
  RecommendationResult,
  StrategySpecification,
} from "./RecommendationStrategy";
import FeatureStrategy from "./FeatureStrategy";

/**
 * A recommendation strategy that returns the highest voted posts that the user
 * hasn't viewed. Note that, for performance reasons, the scores are not inflation
 * adjusted.
 */
class BestOfStrategy extends FeatureStrategy {
  async recommend(
    currentUser: CurrentUser | null,
    count: number,
    strategy: StrategySpecification,
  ): Promise<RecommendationResult> {
    return super.recommend(currentUser, count, {
      ...strategy,
      features: [
        { feature: "karma", weight: 1 },
        { feature: "curated", weight: 0.05 },
      ],
    });
  }
}

export default BestOfStrategy;

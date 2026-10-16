import FeatureStrategy from "./FeatureStrategy";
import type { CurrentUser } from "../users/currentUser";
import type {
  RecommendationResult,
  StrategySpecification,
} from "./RecommendationStrategy";

/**
 * Strategy for choosing recommended "posts you may have missed" for EA Forum
 * wrapped
 */
class WrappedStrategy extends FeatureStrategy {
  constructor() {
    super({
      maxRecommendationCount: 5,
    });
  }

  async recommend(
    currentUser: CurrentUser | null,
    count: number,
    strategy: StrategySpecification,
  ): Promise<RecommendationResult> {
    const year = strategy.year || new Date().getFullYear() - 1;
    return super.recommend(
      currentUser,
      count,
      {
        ...strategy,
        features: [
          { feature: "karma", weight: 1 },
          { feature: "curated", weight: 0.05 },
        ],
      },
      {
        publishedAfter: new Date(year, 0),
        publishedBefore: new Date(year + 1, 0),
      },
    );
  }
}

export default WrappedStrategy;

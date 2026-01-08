import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { postRecommendations, Post } from "../schema";
import type { CurrentUser } from "../users/currentUser";
import { randomId } from "../utils/random";
import MoreFromAuthorStrategy from "./MoreFromAuthorStrategy";
import MoreFromTagStrategy from "./MoreFromTagStrategy";
import BestOfStrategy from "./BestOfStrategy";
import WrappedStrategy from "./WrappedStrategy";
import CollabFilterStrategy from "./CollabFilterStrategy";
import TagWeightedCollabFilterStrategy from "./TagWeightedCollabFilter";
import FeatureStrategy from "./FeatureStrategy";
import NewAndUpvotedInTagStrategy from "./NewAndUpvotedInTagStrategy";
import RecommendationStrategy, {
  RecommendationResult,
  RecommendationStrategyName,
  StrategySpecification,
} from "./RecommendationStrategy";

type ConstructableStrategy = {
  new (): RecommendationStrategy;
};

/**
 * The `RecommendationService` is the external interface to the recommendation system.
 *
 * New algorithms should be implemented by extending the `RecommendationStrategy`
 * abstract class.
 */
class RecommendationService {
  private strategies: Record<RecommendationStrategyName, ConstructableStrategy> = {
    newAndUpvotedInTag: NewAndUpvotedInTagStrategy,
    moreFromTag: MoreFromTagStrategy,
    moreFromAuthor: MoreFromAuthorStrategy,
    bestOf: BestOfStrategy,
    wrapped: WrappedStrategy,
    tagWeightedCollabFilter: TagWeightedCollabFilterStrategy,
    collabFilter: CollabFilterStrategy,
    feature: FeatureStrategy,
  };

  async recommend(
    currentUser: CurrentUser | null,
    clientId: string | null,
    count: number,
    strategy: StrategySpecification,
    disableFallbacks = false,
  ): Promise<Post[]> {
    if (strategy.forceLoggedOutView) {
      currentUser = null;
    }

    const strategies = this.getStrategyStack(strategy.name, disableFallbacks);
    let posts: Post[] = [];

    while (count > 0 && strategies.length) {
      const result = await this.recommendWithStrategyName(
        currentUser,
        count,
        strategy,
        strategies[0],
      );
      const newPosts = result.posts.filter(
        ({ _id }) => !posts.some((post) => post._id === _id),
      );

      const strategyName = strategies[0];
      const strategySettings = { ...result.settings, context: strategy.context };
      void Promise.all(
        posts.map((post) =>
          // We need to write this manually as drizzle can't handle expression indexes
          db.execute(sql`
          INSERT INTO "PostRecommendations" (
            "_id",
            "userId",
            "clientId",
            "postId",
            "strategyName",
            "strategySettings",
            "recommendationCount",
            "lastRecommendedAt",
            "createdAt"
          ) VALUES (
            ${randomId()},
            ${currentUser?._id},
            ${clientId},
            ${post._id},
            ${strategyName},
            ${strategySettings},
            0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          ) ON CONFLICT (
            COALESCE("userId", ''), COALESCE("clientId", ''), "postId"
          ) DO UPDATE SET
            "strategyName" = ${strategyName},
            "strategySettings" = ${strategySettings},
            "lastRecommendedAt" = CURRENT_TIMESTAMP
        `),
        ),
      );

      posts = posts.concat(newPosts);
      count -= newPosts.length;

      strategies.shift();
    }

    return posts;
  }

  private getStrategyStack(
    primaryStrategy: RecommendationStrategyName,
    disableFallbacks = false,
  ): RecommendationStrategyName[] {
    if (disableFallbacks) {
      return [primaryStrategy];
    }
    const strategies = Object.keys(this.strategies) as RecommendationStrategyName[];
    return [primaryStrategy, ...strategies.filter((s) => s !== primaryStrategy)];
  }

  private async recommendWithStrategyName(
    currentUser: CurrentUser | null,
    count: number,
    strategy: StrategySpecification,
    strategyName: RecommendationStrategyName,
  ): Promise<RecommendationResult> {
    const Provider = this.strategies[strategyName];
    if (!Provider) {
      throw new Error("Invalid recommendation strategy name: " + strategyName);
    }
    const source = new Provider();
    try {
      return await source.recommend(currentUser, count, strategy);
    } catch (e) {
      // TODO: sentry
      console.error("Recommendations error:", e);
      const settings = {
        postId: strategy.postId,
        bias: strategy.bias,
        features: strategy.features,
      };
      return { posts: [], settings };
    }
  }

  async markRecommendationAsObserved(
    currentUser: CurrentUser | null,
    clientId: string | null,
    postId: string,
  ): Promise<void> {
    const userId = currentUser?._id ?? null;
    const condition = userId
      ? eq(postRecommendations.userId, userId)
      : clientId
        ? eq(postRecommendations.clientId, clientId)
        : null;
    if (condition) {
      await db
        .update(postRecommendations)
        .set({
          recommendationCount: sql`${postRecommendations.recommendationCount} + 1`,
        })
        .where(and(condition, eq(postRecommendations.postId, postId)));
    }
  }

  async markRecommendationAsClicked(
    currentUser: CurrentUser | null,
    clientId: string | null,
    postId: string,
  ): Promise<void> {
    const userId = currentUser?._id ?? null;
    const condition = userId
      ? eq(postRecommendations.userId, userId)
      : clientId
        ? eq(postRecommendations.clientId, clientId)
        : null;
    if (condition) {
      await db
        .update(postRecommendations)
        .set({
          clickedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(and(condition, eq(postRecommendations.postId, postId)));
    }
  }
}

export default RecommendationService;

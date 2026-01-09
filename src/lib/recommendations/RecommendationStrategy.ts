import { SQL, sql } from "drizzle-orm";
import { db } from "../db";
import { TupleSet, UnionOf } from "../typeHelpers";
import { postStatuses } from "../posts/postLists";
import type { Post } from "../schema";
import type { CurrentUser } from "../users/currentUser";

export type RecommendationStrategyConfig = {
  maxRecommendationCount: number;
  minimumBaseScore: number;
};

export const recommendationStrategyNames = new TupleSet([
  "moreFromAuthor",
  "moreFromTag",
  "newAndUpvotedInTag",
  "bestOf",
  "wrapped",
  "tagWeightedCollabFilter",
  "collabFilter",
  "feature",
] as const);

export type RecommendationStrategyName = UnionOf<typeof recommendationStrategyNames>;

export const recommendationFeatureNames = new TupleSet([
  "karma",
  "curated",
  "tagSimilarity",
  "collabFilter",
  "textSimilarity",
  "subscribedAuthorPosts",
  "subscribedTagPosts",
  "frontpageFilterSettings",
] as const);

export type RecommendationFeatureName = UnionOf<typeof recommendationFeatureNames>;

export type WeightedFeature = {
  feature: RecommendationFeatureName;
  weight: number;
};

export interface StrategySettings {
  /** The post to generate recommendations for. */
  postId: string;
  /** Various strategy use a bias parameter in different ways for tuning - this
   *  is now mostly deprecated in favour of using features. */
  bias?: number;
  /** Target year for the EA Forum wrapped strategy */
  year?: number;
  /** Weighted scoring factors for defining a recommendation algorithm. */
  features?: WeightedFeature[];
  /** The tag to generate recommendations (only used by some some strategies). */
  tagId?: string;
  /** Optional context string - this is not used to generate recommendations,
   *  but is stored along with the recommendation data in the database for
   *  analytics purposes. */
  context?: string;
}

export type StrategySpecification = StrategySettings & {
  name: RecommendationStrategyName;
  forceLoggedOutView?: boolean;
};

export type RecommendationResult = {
  posts: Post[];
  settings: StrategySettings;
};

/**
 * The recommendation system is built on smaller, self-contained, modular "strategies"
 * which are all descended from this base class.
 *
 * External code should access this functionality through the `RecommendationService`
 * rather than using this directly.
 */
abstract class RecommendationStrategy {
  private readonly config: RecommendationStrategyConfig;

  constructor(config: Partial<RecommendationStrategyConfig> = {}) {
    this.config = {
      maxRecommendationCount: config.maxRecommendationCount ?? 3,
      minimumBaseScore: config.minimumBaseScore ?? 30,
    };
  }

  abstract recommend(
    currentUser: CurrentUser | null,
    count: number,
    strategy: StrategySpecification,
  ): Promise<RecommendationResult>;

  /**
   * Create SQL query fragments that filter out posts that the user has already
   * viewed.
   */
  protected getAlreadyReadFilter(currentUser: CurrentUser | null) {
    return currentUser
      ? {
          join: sql`
          LEFT JOIN "ReadStatuses" rs
            ON rs."userId" = ${currentUser._id}
            AND rs."postId" = p."_id"
        `,
          filter: sql`
          rs."isRead" IS NOT TRUE AND
        `,
        }
      : {
          join: sql``,
          filter: sql``,
        };
  }

  /**
   * Create SQL query fragments that filter out posts that the user has already
   * been recommended.
   */
  protected getAlreadyRecommendedFilter(currentUser: CurrentUser | null) {
    const { maxRecommendationCount } = this.config;
    return currentUser
      ? {
          join: sql`
          LEFT JOIN "PostRecommendations" pr
            ON pr."userId" = ${currentUser._id}
            AND pr."postId" = p."_id"
        `,
          filter: sql`
          COALESCE(pr."recommendationCount", 0) < ${maxRecommendationCount} AND
          pr."clickedAt" IS NULL AND
        `,
        }
      : {
          join: sql``,
          filter: sql``,
        };
  }

  /**
   * Create SQL query fragments that filter out non-recommendable posts. This includes
   * applying a base score, excluding posts that are explicitly marked as not
   * suitable for recommendations, and all of the filters from the default view of the
   * Posts collection.
   */
  protected getDefaultPostFilter() {
    return {
      join: sql`
        JOIN "Users" author ON author."_id" = p."userId"
      `,
      filter: sql`
        p."status" = ${postStatuses.STATUS_APPROVED} AND
        p."draft" IS NOT TRUE AND
        p."deletedDraft" IS NOT TRUE AND
        p."isFuture" IS NOT TRUE AND
        p."shortform" IS NOT TRUE AND
        p."hiddenRelatedQuestion" IS NOT TRUE AND
        p."groupId" IS NULL AND
        p."isEvent" IS NOT TRUE AND
        p."baseScore" >= ${this.config.minimumBaseScore} AND
        p."disableRecommendation" IS NOT TRUE AND
        author."deleted" IS NOT TRUE AND
      `,
    };
  }

  /**
   * Create SQL query fragments to exclude posts tagged with non-recommendable
   * tags.
   */
  protected getTagFilter() {
    const community = process.env.COMMUNITY_TAG_ID;
    const aprilFools = process.env.APRIL_FOOLS_TAG_ID;
    return {
      filter: sql`
        COALESCE((p."tagRelevance"->>${community})::INTEGER, 0) < 1 AND
        COALESCE((p."tagRelevance"->>${aprilFools})::INTEGER, 0) < 1
      `,
    };
  }

  /**
   * Find posts in the database using a particular SQL filter, whilst applying
   * the default filters for users, posts and tags.
   */
  protected async recommendDefaultWithPostFilter(
    currentUser: CurrentUser | null,
    count: number,
    postId: string,
    filter: SQL<unknown>,
    sort: keyof Post = "score",
  ): Promise<Post[]> {
    const readFilter = this.getAlreadyReadFilter(currentUser);
    const recommendedFilter = this.getAlreadyRecommendedFilter(currentUser);
    const postFilter = this.getDefaultPostFilter();
    const result = await db.execute<Post>(sql`
      SELECT p.*
      FROM "Posts" p
      ${readFilter.join}
      ${recommendedFilter.join}
      ${postFilter.join}
      WHERE
        p."_id" <> ${postId} AND
        ${readFilter.filter}
        ${recommendedFilter.filter}
        ${postFilter.filter}
        ${filter}
      ORDER BY p."${sort}" DESC
      LIMIT ${count}
    `);
    return result.rows;
  }
}

export default RecommendationStrategy;

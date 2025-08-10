-- @repo Posts

-- @partial viewablePostFilter(posts_table)
NOT posts_table."draft"
AND NOT posts_table."deletedDraft"
AND NOT posts_table."isFuture"
AND NOT posts_table."unlisted"
AND NOT posts_table."shortform"
AND NOT posts_table."rejected"
AND NOT posts_table."authorIsUnreviewed"
AND NOT posts_table."hiddenRelatedQuestion"
AND posts_table."postedAt" IS NOT NULL
AND posts_table."status" = 2

-- @partial userJsonSelector(users_table)
JSON_BUILD_OBJECT(
  '_id', users_table."_id",
  'slug', users_table."slug",
  'displayName', users_table."displayName",
  'createdAt', users_table."createdAt",
  'profileImageId', users_table."profileImageId",
  'karma', users_table."karma",
  'jobTitle', users_table."jobTitle",
  'organization', users_table."organization",
  'postCount', users_table."postCount",
  'commentCount', users_table."commentCount"
)

-- @partial magicSort(posts_table)
  posts_table."sticky" DESC,
  posts_table."stickyPriority" DESC,
  -- New and upvoted sorting:
  -- Calculate score from karma with bonuses for frontpage/curated posts, then
  -- divide by a time decay factor.
  (
    posts_table."baseScore"
    + (CASE WHEN posts_table."frontpageDate" IS NOT NULL THEN 10 ELSE 0 END)
    + (CASE WHEN posts_table."curatedDate" IS NOT NULL THEN 10 ELSE 0 END)
  ) / POW(
    EXTRACT(EPOCH FROM NOW() - posts_table."postedAt") / 3600000 +
      COALESCE(:scoreBias::DOUBLE PRECISION, 2),
    COALESCE(:timeDecayFactor::DOUBLE PRECISION, 0.8)
  ) DESC,
  posts_table."_id" DESC

-- @query frontpagePostsList
SELECT
  p."_id",
  p."slug",
  p."title",
  p."baseScore",
  p."voteCount",
  p."commentCount",
  p."postedAt",
  p."curatedDate",
  p."isEvent",
  p."groupId",
  p."sticky",
  userJsonSelector(u) "user",
  ARRAY_AGG(userJsonSelector(coauthor)) "coauthors"
FROM "Posts" p
LEFT JOIN "Users" u ON p."userId" = u."_id" AND NOT u."deleted"
LEFT JOIN "Users" coauthor ON coauthor."_id" = ANY(p."coauthorUserIds")
WHERE
  viewablePostFilter(p)
  AND NOT p."isEvent"
  AND NOT p."sticky"
  AND p."groupId" IS NULL
  AND p."frontpageDate" > TO_TIMESTAMP(0)
  AND p."postedAt" > NOW() - MAKE_INTERVAL(days => COALESCE(:cutoffDays::INTEGER, 21))
GROUP BY p."_id", u."_id"
ORDER BY magicSort(p)
LIMIT :limit

-- @query sidebarOpportunities
SELECT "_id", "slug", "title", "postedAt", "isEvent", "groupId"
FROM "Posts"
WHERE
  viewablePostFilter("Posts")
  AND NOT "isEvent"
  AND NOT "sticky"
  AND "groupId" IS NULL
  AND "frontpageDate" > TO_TIMESTAMP(0)
  AND "postedAt" > NOW() - MAKE_INTERVAL(days => COALESCE(:cutoffDays::INTEGER, 21))
  -- "Opportunities to take action" tag
  AND ("tagRelevance"->'z8qFsGt5iXyZiLbjN')::INTEGER >= 1
ORDER BY magicSort("Posts")
LIMIT :limit

-- @query sidebarEvents
SELECT
  "_id",
  "slug",
  "title",
  "startTime",
  "onlineEvent",
  "googleLocation",
  "isEvent",
  "groupId"
FROM "Posts"
WHERE
  viewablePostFilter("Posts")
  AND "isEvent"
  AND "startTime" > NOW()
ORDER BY "startTime" ASC, "baseScore" DESC, "_id" DESC
LIMIT :limit

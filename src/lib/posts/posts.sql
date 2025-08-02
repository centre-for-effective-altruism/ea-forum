-- @repo Posts

-- @name frontpagePostsList
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
  (u."_id", u."displayName") "user"
FROM "Posts" p
JOIN "Users" u ON p."userId" = u."_id" AND NOT u."deleted"
WHERE
  NOT "isEvent"
  AND NOT "sticky"
  AND "status" = 2
  AND NOT "draft"
  AND NOT "isFuture"
  AND NOT "unlisted"
  AND NOT "shortform"
  AND NOT "authorIsUnreviewed"
  AND NOT "rejected"
  AND NOT "hiddenRelatedQuestion"
  AND "groupId" IS NULL
  AND "frontpageDate" > TO_TIMESTAMP(0)
  AND "postedAt" > NOW() - MAKE_INTERVAL(days => COALESCE(NULL, 21))
ORDER BY
  "sticky" DESC,
  "stickyPriority" DESC,
  -- New and upvoted sorting:
  -- Calculate score from karma with bonuses for frontpage/curated posts, then
  -- divide by a time decay factor.
  -- scoreBias should default to 2, timeDecayFactor to 0.8.
  (
    "baseScore"
    + (CASE WHEN "frontpageDate" IS NOT NULL THEN 10 ELSE 0 END)
    + (CASE WHEN "curatedDate" IS NOT NULL THEN 10 ELSE 0 END)
    ) / POW(
    EXTRACT(EPOCH FROM NOW() - "postedAt") / 3600000 + COALESCE(NULL, 2),
    COALESCE(NULL, 0.8)
  ) DESC,
  "_id" DESC

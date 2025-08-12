-- @repo Comments

-- @partial viewableCommentFilter(comments_table)
NOT comments_table."rejected"
AND NOT COALESCE(comments_table."debateResponse", FALSE) -- Why is this nullable?
AND NOT comments_table."authorIsUnreviewed"

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

-- @query frontpageQuickTakes
SELECT
  c."_id",
  c."baseScore",
  c."voteCount",
  c."postedAt",
  c."descendentCount",
  contents."html",
  userJsonSelector(u) "user"
FROM "Comments" c
JOIN "Users" u ON c."userId" = u."_id" AND NOT u."deleted"
JOIN "Revisions" contents ON c."contents_latest" = contents."_id"
WHERE
  viewableCommentFilter(c)
  -- TODO Handle community tag here
  AND c."shortform"
  AND c."shortformFrontpage"
  AND NOT c."deleted"
  AND c."parentCommentId" IS NULL
  AND c."createdAt" > NOW() - MAKE_INTERVAL(days => COALESCE(:cutoffDays::INTEGER, 5))
  -- Quick takes older than 2 hours must have at least 1 karma, quick takes
  -- younger than 2 hours must have at least -5 karma
  AND (
    (
      c."baseScore" >= 1
      AND c."createdAt" < NOW() - MAKE_INTERVAL(hours => 2)
    ) OR (
      c."baseScore" >= -5
      AND c."createdAt" >= NOW() - MAKE_INTERVAL(hours => 2)
    )
  )
ORDER BY c."score" DESC, c."lastSubthreadActivity" DESC, c."postedAt" DESC
LIMIT :limit

-- @repo Users

-- @query userByAuth0Id
SELECT
  "_id",
  "banned"
FROM "Users"
WHERE "services"->'auth0'->>'id' = :auth0Id::TEXT
LIMIT 1;

-- @query saveUserLoginToken
UPDATE "Users"
SET "services" = fm_add_to_set(
  "services",
  '{resume,loginTokens}'::TEXT[],
  ('{"when":"' || NOW() || '","hashedToken":"' || :hashedToken::TEXT || '"}')::JSONB
)
WHERE "_id" = :userId::TEXT;

-- @query currentUser
SELECT
  u."_id",
  u."displayName",
  u."slug",
  u."isAdmin",
  u."theme",
  u."hideIntercom",
  u."acceptedTos",
  u."hideNavigationSidebar",
  u."hideHomeRHS",
  u."currentFrontpageFilter",
  u."frontpageFilterSettings",
  u."lastNotificationsCheck",
  u."expandedFrontpageSections"
FROM "Users" u
LEFT JOIN "UserLoginTokens" lt ON
  lt."userId" = u."_id"
  AND lt."hashedToken" = :hashedToken::TEXT
WHERE
  lt."userId" IS NOT NULL
  OR u."services"->'resume'->'loginTokens' @>
    ('[{"hashedToken": "' || :hashedToken::TEXT || '"}]')::JSONB
LIMIT 1;

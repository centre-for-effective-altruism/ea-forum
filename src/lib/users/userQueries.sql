-- @repo Users

-- @query userByAuth0Id
SELECT *
FROM "Users"
WHERE "services"->'auth0'->>'id' = :auth0Id::TEXT
LIMIT 1

-- @query saveUserLoginToken
UPDATE "Users"
SET "services" = fm_add_to_set(
  "services",
  '{resume,loginToken}'::TEXT[],
  ('{"when":"' || NOW() || '","hashedToken":"' || :hashedToken::TEXT || '"}')::JSONB
)
WHERE "_id" = :userId::TEXT

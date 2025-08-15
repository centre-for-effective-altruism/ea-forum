-- @repo Notifications

-- @partial postSocialPreviewSelector(prefix)
  JSON_BUILD_OBJECT(
    'imageUrl',
    CASE
      WHEN prefix."isEvent" AND prefix."eventImageId" IS NOT NULL
        THEN :postSocialPreviewPrefix::TEXT || prefix."eventImageId"
      WHEN prefix."socialPreview"->>'imageId' IS NOT NULL
        THEN :postSocialPreviewPrefix::TEXT || (prefix."socialPreview"->>'imageId')
      ELSE COALESCE(prefix."socialPreviewImageAutoUrl", '')
    END
  )

-- @partial userSelector(prefix)
  CASE WHEN prefix."_id" IS NULL THEN NULL ELSE JSONB_BUILD_OBJECT(
    '_id', prefix."_id",
    'slug', prefix."slug",
    'createdAt', prefix."createdAt",
    'displayName', prefix."displayName",
    'profileImageId', prefix."profileImageId",
    'karma', prefix."karma",
    'deleted', prefix."deleted",
    'htmlBio', COALESCE(prefix."biography"->>'html', ''),
    'postCount', prefix."postCount",
    'commentCount', prefix."commentCount"
  ) END

-- @partial localgroupSelector(prefix)
  CASE WHEN prefix."_id" IS NULL THEN NULL ELSE JSONB_BUILD_OBJECT(
    '_id', prefix."_id",
    'name', prefix."name"
  ) END

-- @partial revisionSelector(prefix)
  CASE WHEN prefix."_id" IS NULL THEN NULL ELSE JSONB_BUILD_OBJECT(
    'html', prefix."html",
    'wordCount', prefix."wordCount",
    'originalContents', prefix."originalContents",
    'editedAt', prefix."editedAt",
    'userId', prefix."userId",
    'version', prefix."version"
  ) END

-- @partial postSelector(prefix, revisionPrefix, userPrefix, localgroupPrefix)
  CASE WHEN prefix."_id" IS NULL THEN NULL ELSE JSONB_BUILD_OBJECT(
    '_id', prefix."_id",
    'slug', prefix."slug",
    'title', prefix."title",
    'draft', prefix."draft",
    'url', prefix."url",
    'isEvent', prefix."isEvent",
    'startTime', prefix."startTime",
    'curatedDate', prefix."curatedDate",
    'postedAt', prefix."postedAt",
    'groupId', prefix."groupId",
    'fmCrosspost', prefix."fmCrosspost",
    'collabEditorDialogue', prefix."collabEditorDialogue",
    'readTimeMinutesOverride', prefix."readTimeMinutesOverride",
    'wordCount', revisionPrefix."wordCount",
    'socialPreviewData', postSocialPreviewSelector(prefix),
    'customHighlight', prefix."customHighlight",
    'contents', revisionSelector(revisionPrefix),
    'rsvps', prefix."rsvps",
    'user', userSelector(userPrefix),
    'group', localgroupSelector(localgroupPrefix)
  ) END

-- @partial commentSelector(pre, userPre, postPre, postRevisionPre, postUserPre, postLocalgroupPre)
  CASE WHEN pre."_id" IS NULL THEN NULL ELSE JSONB_BUILD_OBJECT(
    '_id', pre."_id",
    'user', userSelector(userPre),
    'post', postSelector(postPre, postRevisionPre, postUserPre, postLocalgroupPre)
  ) END

-- @partial tagSelector(prefix)
  CASE WHEN prefix."_id" IS NULL THEN NULL ELSE JSONB_BUILD_OBJECT(
    '_id', prefix."_id",
    'name', prefix."name",
    'slug', prefix."slug"
  ) END

-- @partial sequenceSelector(prefix)
  CASE WHEN prefix."_id" IS NULL THEN NULL ELSE JSONB_BUILD_OBJECT(
    '_id', prefix."_id",
    'title', prefix."title"
  ) END

-- @query notificationDisplays
SELECT
  n."_id",
  n."type",
  n."link",
  n."viewed",
  n."message",
  n."createdAt",
  n."extraData",
  tr."_id" "tagRelId",
  COALESCE(
    postSelector("p", "pr", "pu", "pl"),
    postSelector("trp", "trpr", "trpu", "trpl")
  ) "post",
  commentSelector("c", "cu", "cp", "cpr", "cpu", "cpl") "comment",
  tagSelector("t") "tag",
  sequenceSelector("s") "sequence",
  COALESCE(
    userSelector("nma"),
    userSelector("u")
  ) "user",
  localgroupSelector("l") "localgroup"
FROM "Notifications" n
LEFT JOIN "Posts" p ON
  n."documentType" = 'post' AND
  n."documentId" = p."_id"
LEFT JOIN "Revisions" pr ON
  pr."_id" = p."contents_latest"
LEFT JOIN "Users" pu ON
  p."userId" = pu."_id"
LEFT JOIN "Localgroups" pl ON
  p."groupId" = pl."_id"
LEFT JOIN "Comments" c ON
  n."documentType" = 'comment' AND
  n."documentId" = c."_id"
LEFT JOIN "Users" cu ON
  c."userId" = cu."_id"
LEFT JOIN "Posts" cp ON
  c."postId" = cp."_id"
LEFT JOIN "Revisions" cpr ON
  cpr."_id" = cp."contents_latest"
LEFT JOIN "Users" cpu ON
  cp."userId" = cpu."_id"
LEFT JOIN "Localgroups" cpl ON
  cp."groupId" = cpl."_id"
LEFT JOIN "TagRels" tr ON
  n."documentType" = 'tagRel' AND
  n."documentId" = tr."_id"
LEFT JOIN "Tags" t ON
  t."_id" = tr."tagId"
LEFT JOIN "Posts" trp ON
  trp."_id" = tr."postId"
LEFT JOIN "Revisions" trpr ON
  trpr."_id" = trp."contents_latest"
LEFT JOIN "Users" trpu ON
  trpu."_id" = trp."userId"
LEFT JOIN "Sequences" s ON
  n."documentType" = 'sequence' AND
  n."documentId" = s."_id"
LEFT JOIN "Localgroups" trpl ON
  trpl."_id" = trp."groupId"
LEFT JOIN "Users" u ON
  n."documentType" = 'user' AND
  n."documentId" = u."_id"
LEFT JOIN "Localgroups" l ON
  n."documentType" = 'localgroup' AND
  n."documentId" = l."_id"
LEFT JOIN "Users" nma ON
  n."extraData"->>'newMessageAuthorId' = nma."_id"
WHERE
  n."userId" = :userId::TEXT AND
  n."deleted" IS NOT TRUE AND
  n."emailed" IS NOT TRUE AND
  n."waitingForBatch" IS NOT TRUE AND
  (CASE WHEN :type_::TEXT IS NULL THEN TRUE ELSE n."type" = :type_ END) AND
  COALESCE(n."documentType", '') <> 'message' AND
  NOT COALESCE(p."deletedDraft", FALSE) AND
  NOT COALESCE(pu."deleted", FALSE) AND
  NOT COALESCE(pl."deleted", FALSE) AND
  NOT COALESCE(c."deleted", FALSE) AND
  NOT COALESCE(cu."deleted", FALSE) AND
  NOT COALESCE(cp."deletedDraft", FALSE) AND
  NOT COALESCE(cpu."deleted", FALSE) AND
  NOT COALESCE(cpl."deleted", FALSE) AND
  NOT COALESCE(t."deleted", FALSE) AND
  NOT COALESCE(u."deleted", FALSE) AND
  NOT COALESCE(l."deleted", FALSE) AND
  NOT COALESCE(s."isDeleted", FALSE) AND
  NOT COALESCE(nma."deleted", FALSE)
ORDER BY n."createdAt" DESC
LIMIT :limit
OFFSET :offset

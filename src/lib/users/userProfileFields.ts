import type { User } from "../schema";

export const simpleUserProfileFields: (keyof User)[] = [
  "username",
  "displayName",
  "organizerOfGroupIds",
  "programParticipation",
  "googleLocation",
  "location",
  "mapLocation",
  "profileImageId",
  "jobTitle",
  "organization",
  "careerStage",
  "website",
  "linkedinProfileURL",
  "facebookProfileURL",
  "blueskyProfileURL",
  "twitterProfileURL",
  "githubProfileURL",
  "profileTagIds",
];

export const editableUserProfileFields: (keyof User)[] = [
  "biography",
  "howOthersCanHelpMe",
  "howICanHelpOthers",
];

export const allUserProfileFields = [
  ...simpleUserProfileFields,
  ...editableUserProfileFields,
];

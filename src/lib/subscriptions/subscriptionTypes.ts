export const subscriptionTypes = {
  newComments: "newComments",
  newUserComments: "newUserComments",
  newShortform: "newShortform",
  newPosts: "newPosts",
  newRelatedQuestions: "newRelatedQuestions",
  newEvents: "newEvents",
  newReplies: "newReplies",
  newTagPosts: "newTagPosts",
  newSequencePosts: "newSequencePosts",
  newDebateComments: "newDebateComments",
  newDialogueMessages: "newDialogueMessages",
  newPublishedDialogueMessages: "newPublishedDialogueMessages",
  newActivityForFeed: "newActivityForFeed",
} as const;

export type SubscriptionType =
  (typeof subscriptionTypes)[keyof typeof subscriptionTypes];

export const isSubscriptionType = (type: string): type is SubscriptionType =>
  type in subscriptionTypes;

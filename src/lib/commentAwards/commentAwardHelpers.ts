import sum from "lodash/sum";
import type { User } from "../schema";
import type { CurrentUser } from "../users/currentUser";
import type { CommentListItem } from "../comments/commentLists";

export const commentAwardsEnabled = true;

export const commentAwardPostHref = "#"; // TODO: Add post link

export const commentAwardAmountDollars = 100;

const commentAwardUsers = [
  "D5tAFjN5axTcp9mGL", // Ollie Etherington - just for testing
  "CF3HuBjWBDXgeTp9p", // Toby Tremlett
  "oZa9wz3nG2wgW98az", // Will Aldred
  "TMeHPKbbgoh6i9yvC", // Anthony DiGiovanni
];

export const userCanGiveCommentAwards = (user: Pick<User, "_id"> | null) =>
  commentAwardsEnabled && user && commentAwardUsers.includes(user._id);

export const getMaxCommentAwards = (user: CurrentUser) => {
  if (!userCanGiveCommentAwards(user)) {
    return 0;
  }
  // Toby has 6 awards to give, other users have 7
  return user._id === "CF3HuBjWBDXgeTp9p" ? 6 : 7;
};

export const commentAwardedAmount = (comment: CommentListItem) =>
  sum(comment.awards.map(({ count }) => count)) * commentAwardAmountDollars;

export const commentAwardCountFromUser = (
  comment: CommentListItem,
  user: Pick<User, "_id">,
) => {
  const awards = comment.awards.filter(({ userId }) => userId === user._id);
  return sum(awards.map(({ count }) => count));
};

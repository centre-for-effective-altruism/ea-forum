import { useMemo } from "react";
import type { PostListItem } from "../posts/postLists";
import type { PostDisplay } from "../posts/postQueries";
import type { CurrentUser } from "../users/currentUser";
import { useCurrentUser } from "./useCurrentUser";
import { subscriptionTypes } from "../subscriptions/subscriptionTypes";
import { userGetDisplayName } from "../users/userHelpers";

const getSubscriptionItems = (
  post: PostDisplay | PostListItem,
  currentUser: CurrentUser | null,
) => [
  {
    document: post.group,
    enabled: !!post.group,
    subscribeMessage: `Subscribe to ${post.group?.name}`,
    unsubscribeMessage: `Unsubscribe from ${post.group?.name}`,
    title: `New ${post.group?.name} events`,
    subscriptionType: subscriptionTypes.newEvents,
  },
  {
    document: post,
    enabled: post.shortform && post.user?._id !== currentUser?._id,
    subscribeMessage: `Subscribe to ${post.title}`,
    unsubscribeMessage: `Unsubscribe from ${post.title}`,
    title: `New quick takes from ${userGetDisplayName(post.user)}`,
    subscriptionType: subscriptionTypes.newShortform,
  },
  {
    document: post.user,
    enabled: !!post.user && post.user._id !== currentUser?._id,
    subscribeMessage: `Subscribe to posts by ${userGetDisplayName(post.user)}`,
    unsubscribeMessage: `Unsubscribe from posts by ${userGetDisplayName(post.user)}`,
    title: `New posts by ${userGetDisplayName(post.user)}`,
    subscriptionType: subscriptionTypes.newPosts,
  },
  {
    document: post,
    enabled: true,
    subscribeMessage: "Subscribe to comments on this post",
    unsubscribeMessage: "Unsubscribe from comments on this post",
    title: "New comments on this post",
    subscriptionType: subscriptionTypes.newComments,
  },
];

export const useSubscriptions = (post: PostDisplay | PostListItem) => {
  const { currentUser } = useCurrentUser();
  const subscriptions = useMemo(
    () => getSubscriptionItems(post, currentUser).filter(({ enabled }) => enabled),
    [post, currentUser],
  );
  return {
    subscriptions,
  };
};

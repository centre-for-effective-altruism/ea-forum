"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import stringify from "json-stringify-deterministic";
import type { CommentListItem } from "../comments/commentLists";
import type { PostListItem } from "../posts/postLists";
import type { PostDisplay } from "../posts/postQueries";
import type { CurrentUser } from "../users/currentUser";
import { rpc } from "../rpc";
import { useCurrentUser } from "./useCurrentUser";
import { userGetDisplayName } from "../users/userHelpers";
import {
  SubscriptionType,
  subscriptionTypes,
} from "../subscriptions/subscriptionTypes";
import SubscriptionToggle from "@/components/PostsPage/SubscriptionToggle";

type SubscriptionId = {
  collectionName: string;
  documentId: string;
  type: SubscriptionType;
};

type SubscriptionState = {
  data: { subscribed: boolean } | null;
  loading: boolean;
  error?: unknown;
};

type SubscriptionStore = Record<string, SubscriptionState>;

type SubscriptionContext = {
  listen: (id: SubscriptionId) => void;
  get: (id: SubscriptionId) => SubscriptionState | undefined;
  update: (id: SubscriptionId, value: { subscribed: boolean }) => void;
};

const subscriptionContext = createContext<SubscriptionContext | null>(null);

const cacheKey = ({ collectionName, documentId, type }: SubscriptionId) =>
  `${collectionName}-${documentId}-${type}`;

export const SubscriptionProvider = ({
  children,
}: Readonly<{
  children: ReactNode;
}>) => {
  const { currentUser } = useCurrentUser();
  const [store, setStore] = useState<SubscriptionStore>({});
  const storeRef = useRef(store);
  storeRef.current = store;

  // Clear the store when changing user
  useEffect(() => {
    setStore({});
  }, [currentUser]);

  const fetchIfNeeded = useCallback(
    async (id: SubscriptionId) => {
      const key = cacheKey(id);
      const existing = storeRef.current[key];
      if (!currentUser || existing?.loading || existing?.data) {
        return;
      }

      setStore((prev) => ({
        ...prev,
        [key]: {
          data: null,
          loading: true,
        },
      }));

      try {
        const data = await rpc.subscriptions.fetch(id);
        if (!data) {
          throw new Error("Failed to fetch subscription");
        }
        setStore((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            loading: false,
            data,
          },
        }));
      } catch (error) {
        setStore((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            loading: false,
            error,
          },
        }));
      }
    },
    [currentUser],
  );

  const listen = useCallback(
    (id: SubscriptionId) => {
      const key = cacheKey(id);
      setStore((prev) => ({
        ...prev,
        [key]: {
          data: prev[key]?.data ?? null,
          loading: prev[key]?.loading ?? false,
        },
      }));
      void fetchIfNeeded(id);
    },
    [fetchIfNeeded],
  );

  const get = useCallback((id: SubscriptionId) => store[cacheKey(id)], [store]);

  const update = useCallback(
    async (id: SubscriptionId, value: { subscribed: boolean }) => {
      const key = cacheKey(id);
      setStore((prev) => ({
        ...prev,
        [key]: {
          loading: false,
          data: value,
        },
      }));
      await rpc.subscriptions.update({ ...id, ...value });
    },
    [],
  );

  const value = useMemo(
    () => ({
      listen,
      get,
      update,
    }),
    [listen, get, update],
  );

  return (
    <subscriptionContext.Provider value={value}>
      {children}
    </subscriptionContext.Provider>
  );
};

export const useSubscription = (
  id: SubscriptionId,
): SubscriptionState & {
  update: (subscribed: boolean) => void;
} => {
  const ctx = useContext(subscriptionContext);
  if (!ctx) {
    throw new Error("No subscription provider found");
  }
  const { listen, get, update } = ctx;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableId = useMemo(() => id, [stringify(id)]);
  useEffect(() => listen(stableId), [listen, stableId]);
  const state = get(id) ?? { data: null, loading: true };
  const updateThis = useCallback(
    (subscribed: boolean) => update(stableId, { subscribed }),
    [stableId, update],
  );
  return { ...state, update: updateThis };
};

const getPostSubscriptionItems = (
  post: PostDisplay | PostListItem,
  currentUser: CurrentUser | null,
) => [
  {
    collectionName: "Localgroups",
    documentId: post.group?._id ?? "",
    enabled: !!post.group?._id,
    subscribeMessage: `Subscribe to ${post.group?.name}`,
    unsubscribeMessage: `Unsubscribe from ${post.group?.name}`,
    title: `New ${post.group?.name} events`,
    subscriptionType: subscriptionTypes.newEvents,
  },
  {
    collectionName: "Posts",
    documentId: post._id,
    enabled: post.shortform && post.user?._id !== currentUser?._id,
    subscribeMessage: `Subscribe to ${post.title}`,
    unsubscribeMessage: `Unsubscribe from ${post.title}`,
    title: `New quick takes from ${userGetDisplayName(post.user)}`,
    subscriptionType: subscriptionTypes.newShortform,
  },
  {
    collectionName: "Users",
    documentId: post.user?._id ?? "",
    enabled: !!post.user?._id && post.user._id !== currentUser?._id,
    subscribeMessage: `Subscribe to posts by ${userGetDisplayName(post.user)}`,
    unsubscribeMessage: `Unsubscribe from posts by ${userGetDisplayName(post.user)}`,
    title: `New posts by ${userGetDisplayName(post.user)}`,
    subscriptionType: subscriptionTypes.newPosts,
  },
  {
    collectionName: "Posts",
    documentId: post._id,
    enabled: true,
    subscribeMessage: "Subscribe to comments on this post",
    unsubscribeMessage: "Unsubscribe from comments on this post",
    title: "New comments on this post",
    subscriptionType: subscriptionTypes.newComments,
  },
];

export const usePostSubscriptions = (post: PostDisplay | PostListItem) => {
  const { currentUser } = useCurrentUser();
  const subscriptionMenuItems = useMemo(() => {
    const allSubs = getPostSubscriptionItems(post, currentUser);
    return allSubs
      .filter(({ enabled }) => enabled)
      .map((sub) => (
        <SubscriptionToggle
          key={sub.title}
          title={sub.title}
          collectionName={sub.collectionName}
          documentId={sub.documentId}
          type={sub.subscriptionType}
        />
      ));
  }, [post, currentUser]);
  return {
    subscriptionMenuItems,
  };
};

const getCommentSubscriptionItems = (
  comment: CommentListItem,
  currentUser: CurrentUser | null,
  enableSubscribeToCommentUser: boolean,
) => [
  {
    collectionName: "Posts",
    documentId: comment.post?._id ?? "",
    enabled: Boolean(
      comment.post &&
      comment.shortform &&
      !comment.topLevelCommentId &&
      comment.user?._id &&
      comment.user._id !== currentUser?._id,
    ),
    subscribeMessage: `Subscribe to ${comment.post?.title}`,
    unsubscribeMessage: `Unsubscribe from ${comment.post?.title}`,
    title: `New quick takes from ${userGetDisplayName(comment.user)}`,
    subscriptionType: subscriptionTypes.newShortform,
  },
  {
    collectionName: "Comments",
    documentId: comment._id,
    subscribeMessage: "Subscribe to this comment's replies",
    unsubscribeMessage: "Unsubscribe from this comment's replies",
    title: "New replies to this comment",
    subscriptionType: subscriptionTypes.newReplies,
  },
  {
    collectionName: "Users",
    documentId: comment.user?._id ?? "",
    enabled: enableSubscribeToCommentUser,
    subscribeMessage: `Subscribe to posts by ${comment.user?.displayName}`,
    unsubscribeMessage: `Unsubscribe from posts by ${comment.user?.displayName}`,
    title: `New posts by ${comment.user?.displayName}`,
    subscriptionType: subscriptionTypes.newPosts,
  },
  {
    collectionName: "Users",
    documentId: comment.user?._id ?? "",
    enabled: enableSubscribeToCommentUser,
    subscribeMessage: `Subscribe to all comments by ${comment.user?.displayName}`,
    unsubscribeMessage: `Unsubscribe from all comments by ${comment.user?.displayName}`,
    title: `New comments by ${comment.user?.displayName}`,
    subscriptionType: subscriptionTypes.newUserComments,
  },
];

export const useCommentSubscriptions = (comment: CommentListItem) => {
  const { currentUser } = useCurrentUser();
  const subscriptionMenuItems = useMemo(() => {
    const enableSubscribeToCommentUser = Boolean(
      comment.user?._id && comment.user._id !== currentUser?._id && !comment.deleted,
    );
    const allSubs = getCommentSubscriptionItems(
      comment,
      currentUser,
      enableSubscribeToCommentUser,
    );
    return allSubs
      .filter(({ enabled }) => enabled)
      .map((sub) => (
        <SubscriptionToggle
          key={sub.title}
          title={sub.title}
          collectionName={sub.collectionName}
          documentId={sub.documentId}
          type={sub.subscriptionType}
        />
      ));
  }, [comment, currentUser]);
  return {
    subscriptionMenuItems,
  };
};

const getUserSubscriptionItems = (
  userId: string,
  currentUser: CurrentUser | null,
) => [
  {
    collectionName: "Users",
    documentId: userId,
    enabled: userId !== currentUser?._id,
    // TODO: Should these messages contain the user name?
    subscribeMessage: "Subscribe to user posts",
    unsubscribeMessage: "Unsubscribe from user posts",
    title: "New posts",
    subscriptionType: subscriptionTypes.newPosts,
  },
  {
    collectionName: "Users",
    documentId: userId,
    enabled: userId !== currentUser?._id,
    // TODO: Should these messages contain the user name?
    subscribeMessage: "Subscribe to user comments",
    unsubscribeMessage: "Unsubscribe from user comments",
    title: "New comments",
    subscriptionType: subscriptionTypes.newUserComments,
  },
];

export const useUserSubscriptions = (userId: string) => {
  const { currentUser } = useCurrentUser();
  const subscriptionMenuItems = useMemo(() => {
    const allSubs = getUserSubscriptionItems(userId, currentUser);
    return allSubs
      .filter(({ enabled }) => enabled)
      .map((sub) => (
        <SubscriptionToggle
          key={sub.title}
          title={sub.title}
          collectionName={sub.collectionName}
          documentId={sub.documentId}
          type={sub.subscriptionType}
        />
      ));
  }, [userId, currentUser]);
  return {
    subscriptionMenuItems,
  };
};

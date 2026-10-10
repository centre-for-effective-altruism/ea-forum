"use client";

import { createContext, ReactNode, useContext, useMemo, useState } from "react";

type PostForReadStatus = {
  _id: string;
  readStatus?: { isRead: boolean | null }[];
};

type ItemsReadContext = {
  postsRead: Record<string, boolean>;
  setPostRead: (postId: string, isRead: boolean) => void;
  tagsRead: Record<string, boolean>;
  setTagRead: (tagId: string, isRead: boolean) => void;
};

const itemsReadContext = createContext<ItemsReadContext | null>(null);

export const ItemsReadProvider = ({
  children,
}: Readonly<{ children: ReactNode }>) => {
  const [postsRead, setPostsRead] = useState<Record<string, boolean>>({});
  const [tagsRead, setTagsRead] = useState<Record<string, boolean>>({});
  const value = useMemo(
    () => ({
      postsRead,
      setPostRead: (postId: string, isRead: boolean): void => {
        setPostsRead((postsRead) =>
          postsRead[postId] === isRead
            ? postsRead
            : { ...postsRead, [postId]: isRead },
        );
      },
      tagsRead,
      setTagRead: (tagId: string, isRead: boolean): void => {
        setTagsRead((tagsRead) =>
          tagsRead[tagId] === isRead ? tagsRead : { ...tagsRead, [tagId]: isRead },
        );
      },
    }),
    [postsRead, tagsRead],
  );
  return (
    <itemsReadContext.Provider value={value}>{children}</itemsReadContext.Provider>
  );
};

/**
 * Whether the current user has read a post, preferring anything read during
 * this client session over the read status the page was rendered with.
 */
export const usePostIsRead = (
  post: Pick<PostForReadStatus, "_id" | "readStatus">,
): boolean => {
  const { postsRead } = useItemsRead();
  return !!(post._id in postsRead
    ? postsRead[post._id]
    : post.readStatus?.[0]?.isRead);
};

export const useItemsRead = (): ItemsReadContext => {
  const context = useContext(itemsReadContext);
  if (!context) {
    throw new Error("ItemsReadContext not found");
  }
  return context;
};

"use client";

import { createContext, ReactNode, useContext, useMemo, useState } from "react";

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

export const useItemsRead = (): ItemsReadContext => {
  const context = useContext(itemsReadContext);
  if (!context) {
    throw new Error("ItemsReadContext not found");
  }
  return context;
};

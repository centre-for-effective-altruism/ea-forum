"use client";

import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import type { PostDisplay } from "@/lib/posts/postQueries";

type PostDisplayContext = {
  post: PostDisplay;
  showAudio: boolean;
  toggleShowAudio: () => void;
};

const postDisplayContext = createContext<PostDisplayContext | null>(null);

export const PostDisplayProvider: FC<{
  post: PostDisplay;
  children: ReactNode;
}> = ({ post, children }) => {
  const [showAudio, setShowAudio] = useState(false);
  const toggleShowAudio = useCallback(() => {
    setShowAudio((value) => !value);
  }, []);
  return (
    <postDisplayContext.Provider value={{ post, showAudio, toggleShowAudio }}>
      {children}
    </postDisplayContext.Provider>
  );
};

export const usePostDisplay = () => {
  const context = useContext(postDisplayContext);
  if (!context) {
    throw new Error("No post display context");
  }
  return context;
};

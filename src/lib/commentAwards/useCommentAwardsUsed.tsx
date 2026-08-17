"use client";

import {
  createContext,
  FC,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { userCanGiveCommentAwards } from "./commentAwardHelpers";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { captureException } from "@sentry/nextjs";
import { rpc } from "../rpc";
import toast from "react-hot-toast";

type CommentAwardsUsedContext = {
  awardsUsed: number;
  setAwardsUsed: (value: number) => void;
};

const commentAwardsUsedContext = createContext<CommentAwardsUsedContext | null>(
  null,
);

export const CommentAwardsUsedProvider: FC<{
  children: ReactNode;
}> = ({ children }) => {
  const { currentUser } = useCurrentUser();
  const [awardsUsed, setAwardsUsed] = useState(0);

  useEffect(() => {
    if (!userCanGiveCommentAwards(currentUser)) {
      setAwardsUsed(0);
      return;
    }
    void (async () => {
      try {
        const count = await rpc.commentAwards.countUsed();
        setAwardsUsed(count);
      } catch (e) {
        console.error(e);
        captureException(e);
        toast.error("Failed to fetch comment awards used count");
      }
    })();
  }, [currentUser]);

  return (
    <commentAwardsUsedContext.Provider value={{ awardsUsed, setAwardsUsed }}>
      {children}
    </commentAwardsUsedContext.Provider>
  );
};

export const useCommentAwardsUsed = () => {
  const ctx = useContext(commentAwardsUsedContext);
  if (!ctx) {
    throw new Error("Comment awards used context not found");
  }
  return ctx;
};

"use client";

import {
  createContext,
  Dispatch,
  FC,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useState,
} from "react";
import type { CommentsList } from "@/lib/comments/commentLists";

type QuickTakesListContext = {
  showCommunity: boolean;
  setShowCommunity: Dispatch<SetStateAction<boolean>>;
  localQuickTakes: CommentsList[];
  addLocalQuickTake: (quickTake: CommentsList) => void;
};

const quickTakesListContext = createContext<QuickTakesListContext>({
  showCommunity: false,
  setShowCommunity: () => {},
  localQuickTakes: [],
  addLocalQuickTake: () => {},
});

export const QuickTakesListProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [localQuickTakes, setLocalQuickTakes] = useState<CommentsList[]>([]);
  const [showCommunity, setShowCommunity] = useState(false);
  const addLocalQuickTake = useCallback((quickTake: CommentsList) => {
    setLocalQuickTakes((quickTakes) => [quickTake, ...quickTakes]);
  }, []);
  return (
    <quickTakesListContext.Provider
      value={{
        showCommunity,
        setShowCommunity,
        localQuickTakes,
        addLocalQuickTake,
      }}
    >
      {children}
    </quickTakesListContext.Provider>
  );
};

export const useQuickTakesListContext = () => useContext(quickTakesListContext);

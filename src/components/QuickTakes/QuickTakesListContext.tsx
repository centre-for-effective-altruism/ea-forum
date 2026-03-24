"use client";

import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import type { CurrentUser } from "@/lib/users/currentUser";
import type { CommentsList } from "@/lib/comments/commentLists";
import { useExpandedFrontpageSection } from "@/lib/hooks/useExpandedFrontpageSection";

type QuickTakesListContext = {
  showCommunity: boolean;
  toggleShowCommunity: () => void;
  localQuickTakes: CommentsList[];
  addLocalQuickTake: (quickTake: CommentsList) => void;
};

const quickTakesListContext = createContext<QuickTakesListContext>({
  showCommunity: false,
  toggleShowCommunity: () => {},
  localQuickTakes: [],
  addLocalQuickTake: () => {},
});

export const QuickTakesListProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [localQuickTakes, setLocalQuickTakes] = useState<CommentsList[]>([]);
  const addLocalQuickTake = useCallback((quickTake: CommentsList) => {
    setLocalQuickTakes((quickTakes) => [quickTake, ...quickTakes]);
  }, []);

  // For legacy reasons, toggle whether or not to show community quick takes is
  // stored as a "frontpage expandable section". I don't remember why - it's a bit
  // weird, but it works.
  const { expanded: showCommunity, toggleExpanded: toggleShowCommunity } =
    useExpandedFrontpageSection({
      section: "quickTakesCommunity",
      defaultExpanded: (currentUser: CurrentUser | null) =>
        currentUser?.hideCommunitySection
          ? false
          : !!currentUser?.expandedFrontpageSections?.community,
      onExpandEvent: "quickTakesSectionShowCommunity",
      onCollapseEvent: "quickTakesSectionHideCommunity",
      cookieName: "show_quick_takes_community",
      forceSetCookieIfUndefined: true,
    });

  return (
    <quickTakesListContext.Provider
      value={{
        showCommunity,
        toggleShowCommunity,
        localQuickTakes,
        addLocalQuickTake,
      }}
    >
      {children}
    </quickTakesListContext.Provider>
  );
};

export const useQuickTakesListContext = () => useContext(quickTakesListContext);

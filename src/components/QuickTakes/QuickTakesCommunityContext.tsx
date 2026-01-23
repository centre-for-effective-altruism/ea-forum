"use client";

import {
  createContext,
  Dispatch,
  FC,
  ReactNode,
  SetStateAction,
  useContext,
  useState,
} from "react";

type QuickTakesCommunityContext = {
  showCommunity: boolean;
  setShowCommunity: Dispatch<SetStateAction<boolean>>;
};

const quickTakesCommunityContext = createContext<QuickTakesCommunityContext>({
  showCommunity: false,
  setShowCommunity: () => {},
});

export const QuickTakesCommunityProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [showCommunity, setShowCommunity] = useState(false);
  return (
    <quickTakesCommunityContext.Provider value={{ showCommunity, setShowCommunity }}>
      {children}
    </quickTakesCommunityContext.Provider>
  );
};

export const useQuickTakesCommunityContext = () =>
  useContext(quickTakesCommunityContext);

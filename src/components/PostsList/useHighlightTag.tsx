"use client";

import type { TagBase } from "@/lib/tags/tagQueries";
import { createContext, FC, ReactNode, useContext } from "react";

type HighlightTagContext = {
  highlightTag: TagBase | null;
};

const highlightTagContext = createContext<HighlightTagContext>({
  highlightTag: null,
});

export const HighlightTagProvider: FC<{
  highlightTag: TagBase | null;
  children: ReactNode;
}> = ({ highlightTag, children }) => {
  return (
    <highlightTagContext.Provider value={{ highlightTag }}>
      {children}
    </highlightTagContext.Provider>
  );
};

export const useHighlightTag = () => useContext(highlightTagContext);

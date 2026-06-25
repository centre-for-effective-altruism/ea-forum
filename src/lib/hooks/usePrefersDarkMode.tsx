import React, { createContext, useContext, useState, useEffect } from "react";
import { useTracking } from "../../lib/analyticsEvents";
import { isClient } from "../environment";

const prefersDarkModeContext = createContext(false);

const buildQuery = () =>
  isClient && "matchMedia" in window
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : {
        matches: false,
        addEventListener: () => {},
        removeEventListener: () => {},
      };

export const PrefersDarkModeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [query] = useState(() => buildQuery());
  const [prefersDarkMode, setPrefersDarkMode] = useState(query.matches);
  const { captureEvent } = useTracking();

  useEffect(() => {
    // Check that query.addEventListener exists before using it, because on
    // some browsers (older iOS Safari) it doesn't.
    if (!query.addEventListener) {
      return;
    }
    const handler = (({ matches }: MediaQueryListEvent) => {
      setPrefersDarkMode(matches);
      captureEvent("prefersDarkModeChange", {
        prefersDarkMode: matches,
      });
    }) as (ev: Event) => void;
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, [captureEvent, query]);

  return (
    <prefersDarkModeContext.Provider value={prefersDarkMode}>
      {children}
    </prefersDarkModeContext.Provider>
  );
};

export const usePrefersDarkMode = () => useContext(prefersDarkModeContext);

export const devicePrefersDarkMode = () => {
  const query = buildQuery();
  return query?.matches ?? false;
};

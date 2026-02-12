"use client";

import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import { useTracking } from "../analyticsEvents";
import { useCurrentUser } from "./useCurrentUser";
import { FilterSettings, getDefaultFilterSettings } from "../filterSettings";

type FilterSettingsContext = {
  showFilterSettings: boolean;
  toggleShowFilterSettings: () => void;
  filterSettings: FilterSettings;
};

const filterSettingsContext = createContext<FilterSettingsContext | null>(null);

export const FilterSettingsProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { captureEvent } = useTracking();
  const { currentUser } = useCurrentUser();
  const [showFilterSettings, setShowFilterSettings] = useState(false);

  const [filterSettings, setFilterSettings] = useState(
    currentUser?.frontpageFilterSettings ?? getDefaultFilterSettings(),
  );

  void setFilterSettings; // TODO

  const toggleShowFilterSettings = useCallback(() => {
    setShowFilterSettings((show) => {
      const newShow = !show;
      captureEvent("filterSettingsClicked", {
        settingsVisible: newShow,
        settings: filterSettings,
      });
      return newShow;
    });
  }, [captureEvent, filterSettings]);

  return (
    <filterSettingsContext.Provider
      value={{ showFilterSettings, toggleShowFilterSettings, filterSettings }}
    >
      {children}
    </filterSettingsContext.Provider>
  );
};

export const useFilterSettings = () => {
  const ctx = useContext(filterSettingsContext);
  if (!ctx) {
    throw new Error("No filter settings provider found");
  }
  return ctx;
};

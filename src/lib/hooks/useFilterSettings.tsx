"use client";

import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import { rpc } from "../rpc";
import { useTracking } from "../analyticsEvents";
import { useCurrentUser } from "./useCurrentUser";
import {
  FilterMode,
  FilterSettings,
  getDefaultFilterSettings,
} from "../filterSettings";

type FilterSettingsContext = {
  showFilterSettings: boolean;
  toggleShowFilterSettings: () => void;
  filterSettings: FilterSettings;
  addFilterTag: (_id: string, name: string) => void;
  updateFilterTag: (_id: string, filterMode: FilterMode) => void;
  removeFilterTag: (_id: string) => void;
  updatePersonal: (filterMode: FilterMode) => void;
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

  const updateFilterSettings = useCallback(
    (update: (previousSettings: FilterSettings) => FilterSettings) => {
      setFilterSettings((previousSettings) => {
        const newSettings = update(previousSettings);
        void rpc.users.updateFilterSettings(newSettings);
        return newSettings;
      });
    },
    [],
  );

  const addFilterTag = useCallback(
    (_id: string, name: string) => {
      updateFilterSettings((filterSettings) => ({
        ...filterSettings,
        tags: [
          ...filterSettings.tags.filter(({ tagId }) => tagId !== _id),
          { tagId: _id, tagName: name, filterMode: "Subscribed" },
        ],
      }));
    },
    [updateFilterSettings],
  );

  const updateFilterTag = useCallback(
    (_id: string, filterMode: FilterMode) => {
      updateFilterSettings((filterSettings) => ({
        ...filterSettings,
        tags: filterSettings.tags.map((tag) =>
          tag.tagId === _id ? { ...tag, filterMode } : tag,
        ),
      }));
    },
    [updateFilterSettings],
  );

  const removeFilterTag = useCallback(
    (_id: string) => {
      updateFilterSettings((filterSettings) => ({
        ...filterSettings,
        tags: filterSettings.tags.filter(({ tagId }) => tagId !== _id),
      }));
    },
    [updateFilterSettings],
  );

  const updatePersonal = useCallback(
    (filterMode: FilterMode) => {
      updateFilterSettings((filterSettings) => ({
        ...filterSettings,
        personalBlog: filterMode,
      }));
    },
    [updateFilterSettings],
  );

  return (
    <filterSettingsContext.Provider
      value={{
        showFilterSettings,
        toggleShowFilterSettings,
        filterSettings,
        addFilterTag,
        updateFilterTag,
        removeFilterTag,
        updatePersonal,
      }}
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

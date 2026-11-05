"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { captureException } from "@sentry/nextjs";
import { useTabIndicator } from "@/lib/hooks/useTabIndicator";
import { useTracking } from "@/lib/analyticsEvents";
import { rpc } from "@/lib/rpc";
import {
  getSavedPageTab,
  InitialSavedPageTabData,
  SavedPageTabData,
  SavedPageTabName,
  savedPageListLimit,
  savedPageTabHref,
  savedPageTabs,
} from "./savedPageHelpers";
import clsx from "clsx";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";
import TextLinkButton from "../TextLinkButton";
import TabIndicator from "../TabIndicator";
import ReadHistoryList from "./ReadHistoryList";
import VoteHistoryList from "./VoteHistoryList";
import SavedTab from "./SavedTab";
import Type from "../Type";

const limit = savedPageListLimit;

const fetchTabData: {
  [K in SavedPageTabName]: () => Promise<SavedPageTabData[K]>;
} = {
  saved: async () => {
    const [continueReading, posts, comments] = await Promise.all([
      rpc.sequences.listContinueReading(),
      rpc.bookmarks.listPosts({ limit }),
      rpc.bookmarks.listComments({ limit }),
    ]);
    return { continueReading, posts: posts.items, comments: comments.items };
  },
  readhistory: async () => (await rpc.readStatuses.listHistory({ limit })).items,
  votehistory: async () => (await rpc.votes.listHistory({ limit })).items,
};

const TabPanel = ({
  tab,
  activeTab,
  children,
}: Readonly<{
  tab: SavedPageTabName;
  activeTab: SavedPageTabName;
  children: ReactNode;
}>) => (
  <div
    role="tabpanel"
    id={`saved-tabpanel-${tab}`}
    aria-labelledby={`saved-tab-${tab}`}
    hidden={tab !== activeTab}
  >
    {children}
  </div>
);

export default function SavedPageTabs({
  initialData,
}: Readonly<{
  initialData: InitialSavedPageTabData;
}>) {
  const { captureEvent } = useTracking();
  const [activeTab, setActiveTab] = useState<SavedPageTabName>(initialData.tab);
  const [data, setData] = useState<Partial<SavedPageTabData>>({
    [initialData.tab]: initialData.data,
  });
  const [failedTabs, setFailedTabs] = useState<
    Partial<Record<SavedPageTabName, true>>
  >({});
  const loadingTabs = useRef(new Set<SavedPageTabName>([initialData.tab]));
  const { tabListRef, setTabRef, indicator, animate, enableAnimation } =
    useTabIndicator(activeTab);

  const loadTab = useCallback(async <K extends SavedPageTabName>(tab: K) => {
    if (loadingTabs.current.has(tab)) {
      return;
    }
    loadingTabs.current.add(tab);
    setFailedTabs(({ [tab]: _, ...failedTabs }) => failedTabs);
    try {
      const tabData = await fetchTabData[tab]();
      setData((data) => ({ ...data, [tab]: tabData }));
    } catch (e) {
      captureException(e);
      loadingTabs.current.delete(tab);
      setFailedTabs((failedTabs) => ({ ...failedTabs, [tab]: true }));
    }
  }, []);

  const selectTab = useCallback(
    (tab: SavedPageTabName) => {
      enableAnimation();
      setActiveTab(tab);
      window.history.replaceState(null, "", savedPageTabHref(tab));
      void loadTab(tab);
    },
    [enableAnimation, loadTab],
  );

  // The legacy site stored the tab in the hash (eg; /saved#readhistory)
  useEffect(() => {
    const hashTab = window.location.hash.slice(1);
    if (hashTab && getSavedPageTab(hashTab) === hashTab) {
      selectTab(getSavedPageTab(hashTab));
    }
  }, [selectTab]);

  const onClickTab = useCallback(
    (tab: SavedPageTabName) => {
      if (tab !== activeTab) {
        captureEvent("savedPageTabChange", { tab });
        selectTab(tab);
      }
    },
    [activeTab, captureEvent, selectTab],
  );

  const activeTabFailed = !!failedTabs[activeTab];

  return (
    <div data-component="SavedPageTabs" className="flex flex-col gap-4">
      <div
        ref={tabListRef}
        role="tablist"
        aria-label="Saved & read"
        className="relative flex border-b border-gray-200 overflow-x-auto"
      >
        {savedPageTabs.map(({ name, label }) => (
          <button
            key={name}
            ref={setTabRef(name)}
            role="tab"
            id={`saved-tab-${name}`}
            aria-selected={name === activeTab}
            aria-controls={`saved-tabpanel-${name}`}
            onClick={onClickTab.bind(null, name)}
            className={clsx(
              "cursor-pointer px-3 py-3 border-b-2 border-transparent whitespace-nowrap",
              name === activeTab
                ? clsx("text-gray-1000", !indicator && "border-primary")
                : "text-gray-600 hover:text-gray-1000",
            )}
          >
            <Type style="bodyLarge">{label}</Type>
          </button>
        ))}
        <TabIndicator indicator={indicator} animate={animate} />
      </div>
      {data.saved && (
        <TabPanel tab="saved" activeTab={activeTab}>
          <SavedTab {...data.saved} />
        </TabPanel>
      )}
      {data.readhistory && (
        <TabPanel tab="readhistory" activeTab={activeTab}>
          <ReadHistoryList initialPosts={data.readhistory} />
        </TabPanel>
      )}
      {data.votehistory && (
        <TabPanel tab="votehistory" activeTab={activeTab}>
          <VoteHistoryList initialVotes={data.votehistory} />
        </TabPanel>
      )}
      {!data[activeTab] &&
        (activeTabFailed ? (
          <div className="flex flex-col items-start gap-2">
            <Type className="text-error">Failed to load. Please try again.</Type>
            <TextLinkButton variant="primary" onClick={() => loadTab(activeTab)}>
              Retry
            </TextLinkButton>
          </div>
        ) : (
          <PostsListSkeleton count={10} />
        ))}
    </div>
  );
}

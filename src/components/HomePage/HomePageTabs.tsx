"use client";

import {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  getCurrentHomePageTab,
  homePageTabCookie,
  HomePageTabName,
  homePageTabs,
  preMarginalFundingHomePageTabCookie,
} from "./homePageHelpers";
import { useCookiesWithConsent } from "@/lib/cookies/useCookiesWithConsent";
import {
  defaultFeaturedViewType,
  featuredViewTypeCookie,
  isPostsListViewType,
} from "@/lib/posts/postsListView";
import { renderHomePageContentAction } from "./homePageActions";
import { useTracking } from "@/lib/analyticsEvents";
import HomePageTabSkeleton from "./HomePageTabSkeleton";
import Type from "../Type";
import clsx from "clsx";

export function HomePageTabsSkeleton({
  className,
}: Readonly<{
  className?: string;
}>) {
  return (
    <div className={clsx("flex gap-6 overflow-hidden", className)}>
      {homePageTabs.map(({ label, name }) => (
        <Type
          key={name}
          style="homePageTab"
          className="pb-2 flex-none whitespace-nowrap"
        >
          <span className="rounded bg-gray-200 text-transparent">{label}</span>
        </Type>
      ))}
    </div>
  );
}

export default function HomePageTabs({
  initialContent,
  initialContentTab,
  className,
}: Readonly<{
  // initialContent and initialContentTab should match
  initialContent: ReactNode;
  initialContentTab: HomePageTabName;
  className?: string;
}>) {
  const { captureEvent } = useTracking();
  const [cookies, setCookie] = useCookiesWithConsent([
    homePageTabCookie,
    featuredViewTypeCookie,
    preMarginalFundingHomePageTabCookie,
  ]);
  const initialTab = getCurrentHomePageTab(cookies);
  const featuredViewCookie = cookies.featured_view_type ?? "";
  const featuredView = isPostsListViewType(featuredViewCookie)
    ? featuredViewCookie
    : defaultFeaturedViewType;
  const [currentTab, rawSetCurrentTab] = useState<HomePageTabName>(initialTab);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });
  // When navigating back to the home page the server-rendered content can come
  // from the client-side router cache, in which case it may be for a different
  // tab than the one most recently selected
  const initialContentIsStale = initialContentTab !== initialTab;
  const [content, setContent] = useState<ReactNode>(
    initialContentIsStale ? null : initialContent,
  );
  const [pending, startTransition] = useTransition();
  const requestId = useRef(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<HomePageTabName, HTMLElement | null>>({
    featured: null,
    magic: null,
    marginalFunding: null,
  });

  useEffect(() => {
    const activeTab = tabRefs.current[currentTab];
    const container = containerRef.current;
    if (activeTab && container) {
      setUnderlineStyle({
        left: activeTab.offsetLeft,
        width: activeTab.offsetWidth,
      });
    }
  }, [currentTab]);

  const [isScrolledAllTheWayLeft, setIsScrolledAllTheWayLeft] = useState(true);
  const [isScrolledAllTheWayRight, setIsScrolledAllTheWayRight] = useState(true);

  const updateScrollBounds = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setIsScrolledAllTheWayLeft(scrollLeft <= 0);
      setIsScrolledAllTheWayRight(scrollLeft + clientWidth >= scrollWidth - 1);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    updateScrollBounds();
    const observer = new ResizeObserver(updateScrollBounds);
    observer.observe(container);
    for (const tab of Object.values(tabRefs.current)) {
      if (tab) {
        observer.observe(tab);
      }
    }
    return () => observer.disconnect();
  }, [updateScrollBounds]);

  useEffect(() => {
    const updateUnderline = () => {
      const activeTab = tabRefs.current[currentTab];
      if (activeTab) {
        setUnderlineStyle({
          left: activeTab.offsetLeft,
          width: activeTab.offsetWidth,
        });
      }
    };
    updateUnderline();
    window.addEventListener("resize", updateUnderline);
    return () => window.removeEventListener("resize", updateUnderline);
  }, [currentTab]);

  const loadTabContent = useCallback((tab: HomePageTabName) => {
    const id = ++requestId.current;
    startTransition(async () => {
      const result = await renderHomePageContentAction(tab);
      if (id === requestId.current) {
        setContent(result);
      }
    });
  }, []);

  useEffect(() => {
    if (initialContentIsStale) {
      loadTabContent(initialTab);
    }
    // Only check this on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCurrentTab = useCallback(
    (tab: HomePageTabName) => {
      if (
        tab === "marginalFunding" &&
        currentTab !== "marginalFunding" &&
        !cookies[preMarginalFundingHomePageTabCookie]
      ) {
        setCookie(preMarginalFundingHomePageTabCookie, currentTab);
      }
      rawSetCurrentTab(tab);
      setCookie(homePageTabCookie, tab);
      captureEvent("setFrontpageTab", { tab });
      loadTabContent(tab);
    },
    [currentTab, cookies, setCookie, captureEvent, loadTabContent],
  );

  const currentTabConfig = homePageTabs.find(({ name }) => name === currentTab);
  const activeColor =
    currentTabConfig && "activeColor" in currentTabConfig
      ? currentTabConfig.activeColor
      : undefined;

  return (
    <div data-component="HomePageTabs">
      <div className={clsx("relative", className)}>
        <div
          className="relative flex gap-6 overflow-x-auto overflow-y-hidden no-scrollbars"
          ref={containerRef}
          onScroll={updateScrollBounds}
        >
          {homePageTabs.map(({ label, name }) => (
            <Type
              key={name}
              As="button"
              style="homePageTab"
              onClick={() => setCurrentTab(name)}
              innerRef={(el: HTMLButtonElement | null) => {
                tabRefs.current[name] = el;
              }}
              className={clsx(
                "cursor-pointer relative pb-2 flex-none whitespace-nowrap",
                name === currentTab
                  ? "text-gray-1000"
                  : "text-gray-400 hover:text-gray-500 transition-all",
              )}
              cssStyle={
                name === currentTab && activeColor
                  ? { color: activeColor }
                  : undefined
              }
            >
              {label}
            </Type>
          ))}
          <span
            aria-hidden
            style={{ ...underlineStyle, backgroundColor: activeColor }}
            className="
              absolute bottom-0 h-0.5 bg-gray-1000 pointer-events-none
              transition-all duration-300 ease-in-out
            "
          />
        </div>
        <div
          aria-hidden
          className={clsx(
            "absolute inset-y-0 left-0 w-8 pointer-events-none",
            "bg-linear-to-r from-background to-transparent transition-opacity",
            isScrolledAllTheWayLeft ? "opacity-0" : "opacity-100",
          )}
        />
        <div
          aria-hidden
          className={clsx(
            "absolute inset-y-0 right-0 w-8 pointer-events-none",
            "bg-linear-to-l from-background to-transparent transition-opacity",
            isScrolledAllTheWayRight ? "opacity-0" : "opacity-100",
          )}
        />
      </div>
      {pending || !content ? (
        <HomePageTabSkeleton tab={currentTab} featuredView={featuredView} />
      ) : (
        content
      )}
    </div>
  );
}

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
} from "./homePageHelpers";
import { useCookiesWithConsent } from "@/lib/cookies/useCookiesWithConsent";
import {
  defaultFeaturedViewType,
  isPostsListViewType,
} from "@/lib/posts/postsListView";
import { renderHomePageContentAction } from "./homePageActions";
import { useTracking } from "@/lib/analyticsEvents";
import HomePageTabSkeleton from "./HomePageTabSkeleton";
import Type from "../Type";
import clsx from "clsx";

export default function HomePageTabs({
  initialContent,
  testGroup,
  className,
}: Readonly<{
  initialContent: ReactNode;
  testGroup?: string;
  className?: string;
}>) {
  const { captureEvent } = useTracking();
  const [cookies, setCookie] = useCookiesWithConsent([
    homePageTabCookie,
    "featured_view_type",
  ]);
  const initialTab = getCurrentHomePageTab(cookies, testGroup);
  const featuredViewCookie = cookies.featured_view_type ?? "";
  const featuredView = isPostsListViewType(featuredViewCookie)
    ? featuredViewCookie
    : defaultFeaturedViewType;
  const [currentTab, rawSetCurrentTab] = useState<HomePageTabName>(initialTab);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });
  const [content, setContent] = useState(initialContent);
  const [pending, startTransition] = useTransition();
  const requestId = useRef(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<HomePageTabName, HTMLElement | null>>({
    featured: null,
    magic: null,
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

  const setCurrentTab = useCallback(
    (tab: HomePageTabName) => {
      rawSetCurrentTab(tab);
      setCookie(homePageTabCookie, tab);
      captureEvent("setFrontpageTab", { tab });
      const id = ++requestId.current;
      startTransition(async () => {
        const result = await renderHomePageContentAction(tab);
        if (id === requestId.current) {
          setContent(result);
        }
      });
    },
    [setCookie, captureEvent],
  );

  return (
    <div data-component="HomePageTabs">
      <div className={clsx("relative flex gap-6", className)} ref={containerRef}>
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
              "cursor-pointer relative pb-2",
              name === currentTab
                ? "text-gray-1000"
                : "text-gray-400 hover:text-gray-500 transition-all",
            )}
          >
            {label}
          </Type>
        ))}
        <span
          aria-hidden
          style={underlineStyle}
          className="
            absolute bottom-0 h-0.5 bg-gray-1000 pointer-events-none
            transition-all duration-300 ease-in-out
          "
        />
      </div>
      {pending ? (
        <HomePageTabSkeleton tab={currentTab} featuredView={featuredView} />
      ) : (
        content
      )}
    </div>
  );
}

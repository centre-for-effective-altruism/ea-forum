import { useCallback, useEffect, useRef, useState } from "react";

export type TabIndicatorPosition = {
  left: number;
  width: number;
};

/**
 * Tracks the position of the active tab so that an underline can slide
 * between tabs. Animation is only enabled once the user changes tab, so the
 * indicator doesn't slide in from the left on the initial render.
 */
export const useTabIndicator = <T extends string>(activeTab: T) => {
  const tabRefs = useRef<Partial<Record<T, HTMLElement>>>({});
  const tabListRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<TabIndicatorPosition | null>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const tabList = tabListRef.current;
    const activeTabElement = tabRefs.current[activeTab];
    if (!tabList || !activeTabElement) {
      return;
    }
    const updateIndicator = () =>
      setIndicator({
        left: activeTabElement.offsetLeft,
        width: activeTabElement.offsetWidth,
      });
    updateIndicator();
    const resizeObserver = new ResizeObserver(updateIndicator);
    resizeObserver.observe(tabList);
    resizeObserver.observe(activeTabElement);
    return () => resizeObserver.disconnect();
  }, [activeTab]);

  const setTabRef = useCallback(
    (tab: T) => (element: HTMLElement | null) => {
      if (element) {
        tabRefs.current[tab] = element;
      } else {
        delete tabRefs.current[tab];
      }
    },
    [],
  );

  const enableAnimation = useCallback(() => setAnimate(true), []);

  return { tabListRef, setTabRef, indicator, animate, enableAnimation };
};

"use client";

import { useEffect, useRef, useState } from "react";
import Type from "../Type";
import clsx from "clsx";

const tabs = [
  {
    label: "Featured",
    name: "featured",
  },
  {
    label: "New & upvoted",
    name: "magic",
  },
] as const;

type TabName = (typeof tabs)[number]["name"];

export default function HomePageTabs() {
  const [currentTab, setCurrentTab] = useState<TabName>(tabs[0].name);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<TabName, HTMLElement | null>>({
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

  return (
    <div
      data-component="HomePageTabs"
      className="relative flex gap-6"
      ref={containerRef}
    >
      {tabs.map(({ label, name }) => (
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
            name === currentTab ? "text-gray-1000" : "text-gray-400",
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
  );
}

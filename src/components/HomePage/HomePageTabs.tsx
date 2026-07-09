"use client";

import { useEffect, useRef, useState } from "react";
import { HomePageTabName, homePageTabs, useHomePage } from "./HomePageContext";
import Type from "../Type";
import clsx from "clsx";

export default function HomePageTabs({
  className,
}: Readonly<{
  className?: string;
}>) {
  const { currentTab, setCurrentTab } = useHomePage();
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });

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

  return (
    <div
      data-component="HomePageTabs"
      className={clsx("relative flex gap-6", className)}
      ref={containerRef}
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

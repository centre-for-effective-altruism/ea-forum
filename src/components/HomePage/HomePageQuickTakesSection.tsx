"use client";

import type { ReactNode } from "react";
import type { TagBase } from "@/lib/tags/tagQueries";
import { useExpandedFrontpageSection } from "@/lib/hooks/useExpandedFrontpageSection";
import { QuickTakesListProvider } from "../QuickTakes/QuickTakesListContext";
import QuickTakesCommunityToggle from "../QuickTakes/QuickTakesCommunityToggle";
import NewQuickTake from "../QuickTakes/NewQuickTake";
import ExpandableSection from "./ExpandableSection";
import Type from "../Type";
import Link from "../Link";

export default function HomePageQuickTakesSection({
  coreTags,
  className,
  children,
}: Readonly<{
  coreTags: TagBase[];
  className?: string;
  children: ReactNode;
}>) {
  const { expanded, toggleExpanded } = useExpandedFrontpageSection({
    section: "quickTakes",
    defaultExpanded: "all",
    onExpandEvent: "quickTakesSectionExpanded",
    onCollapseEvent: "quickTakesSectionCollapsed",
    cookieName: "show_quick_takes_section",
  });
  return (
    <QuickTakesListProvider>
      <ExpandableSection
        title="Quick takes"
        rightNode={
          <div className="flex items-center gap-3">
            <QuickTakesCommunityToggle className="hidden sm:block" />
            <Type style="loadMore">
              <Link
                href="/quicktakes"
                className="inline-block text-gray-600 hover:bg-gray-100 rounded px-2 py-1 -mx-2 -my-1"
              >
                View more
              </Link>
            </Type>
          </div>
        }
        expanded={expanded}
        toggleExpanded={toggleExpanded}
        className={className}
      >
        <NewQuickTake coreTags={coreTags} className="mb-1" />
        {children}
      </ExpandableSection>
    </QuickTakesListProvider>
  );
}

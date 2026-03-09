"use client";

import type { ReactNode } from "react";
import { useExpandedFrontpageSection } from "@/lib/hooks/useExpandedFrontpageSection";
import { QuickTakesListProvider } from "../QuickTakes/QuickTakesListContext";
import QuickTakesCommunityToggle from "../QuickTakes/QuickTakesCommunityToggle";
import NewQuickTake from "../QuickTakes/NewQuickTake";
import ExpandableSection from "./ExpandableSection";
import Type from "../Type";
import Link from "../Link";

export default function HomePageQuickTakesSection({
  className,
  children,
}: Readonly<{
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
                className="text-gray-600 hover:text-gray-1000"
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
        <NewQuickTake className="mb-1" />
        {children}
      </ExpandableSection>
    </QuickTakesListProvider>
  );
}

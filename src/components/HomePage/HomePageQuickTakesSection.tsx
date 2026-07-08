"use client";

import type { ReactNode } from "react";
import type { TagBase } from "@/lib/tags/tagQueries";
import { useExpandedFrontpageSection } from "@/lib/hooks/useExpandedFrontpageSection";
import { QuickTakesListProvider } from "../QuickTakes/QuickTakesListContext";
import QuickTakesCommunityToggle from "../QuickTakes/QuickTakesCommunityToggle";
import NewQuickTake from "../QuickTakes/NewQuickTake";
import ExpandableSection from "./ExpandableSection";
import TextLinkButton from "../TextLinkButton";

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
            <TextLinkButton href="/quicktakes">View more</TextLinkButton>
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

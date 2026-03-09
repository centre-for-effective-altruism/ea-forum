"use client";

import type { ReactNode } from "react";
import { useExpandedFrontpageSection } from "@/lib/hooks/useExpandedFrontpageSection";
import ExpandableSection from "./ExpandableSection";

export default function HomePagePopularCommentsSection({
  className,
  children,
}: Readonly<{
  className?: string;
  children: ReactNode;
}>) {
  const { expanded, toggleExpanded } = useExpandedFrontpageSection({
    section: "popularComments",
    defaultExpanded: "all",
    onExpandEvent: "popularCommentsSectionExpanded",
    onCollapseEvent: "popularCommentsSectionCollapsed",
    cookieName: "show_popular_comments_section",
  });
  return (
    <ExpandableSection
      title="Popular comments"
      expanded={expanded}
      toggleExpanded={toggleExpanded}
      className={className}
    >
      {children}
    </ExpandableSection>
  );
}

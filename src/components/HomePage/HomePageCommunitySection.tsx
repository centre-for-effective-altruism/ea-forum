"use client";

import type { ReactNode } from "react";
import { useExpandedFrontpageSection } from "@/lib/hooks/useExpandedFrontpageSection";
import ExpandableSection from "./ExpandableSection";
import TextLinkButton from "../TextLinkButton";

export default function HomePageCommunitySection({
  className,
  children,
}: Readonly<{
  className?: string;
  children: ReactNode;
}>) {
  const { expanded, toggleExpanded } = useExpandedFrontpageSection({
    section: "community",
    onExpandEvent: "communityPostsSectionExpanded",
    onCollapseEvent: "communityPostsSectionCollapsed",
    defaultExpanded: "all",
    cookieName: "show_community_posts_section",
  });
  return (
    <ExpandableSection
      title="Posts tagged community"
      rightNode={
        <TextLinkButton href="/topics/community" className="max-md:hidden">
          View more
        </TextLinkButton>
      }
      expanded={expanded}
      toggleExpanded={toggleExpanded}
      className={className}
    >
      {children}
      <div className="md:hidden mt-1 flex flex-row-reverse">
        <TextLinkButton href="/topics/community">View more</TextLinkButton>
      </div>
    </ExpandableSection>
  );
}

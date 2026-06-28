"use client";

import type { ReactNode } from "react";
import { useExpandedFrontpageSection } from "@/lib/hooks/useExpandedFrontpageSection";
import ExpandableSection from "./ExpandableSection";
import Type from "../Type";
import Link from "../Link";

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
        <Type style="loadMore" className="max-md:hidden">
          <Link
            href="/topics/community"
            className="inline-block text-gray-600 hover:bg-gray-100 rounded px-2 py-1 -mx-2 -my-1"
          >
            View more
          </Link>
        </Type>
      }
      expanded={expanded}
      toggleExpanded={toggleExpanded}
      className={className}
    >
      {children}
      <div className="md:hidden mt-1 flex flex-row-reverse">
        <Type style="loadMore">
          <Link
            href="/topics/community"
            className="inline-block text-gray-600 hover:bg-gray-100 rounded px-2 py-1 -mx-2 -my-1"
          >
            View more
          </Link>
        </Type>
      </div>
    </ExpandableSection>
  );
}

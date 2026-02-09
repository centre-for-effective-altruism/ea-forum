"use client";

import { useEffect, CSSProperties, useState } from "react";
import type { TableOfContents } from "@/lib/revisions/htmlToTableOfContents";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import Link from "../Link";
import Type from "../Type";

export default function PostTableOfContents({
  title,
  contents,
  commentCount,
  className,
}: Readonly<{
  title: string;
  contents: TableOfContents | null;
  commentCount: number;
  className?: string;
}>) {
  const [currentAnchor, setCurrentAnchor] = useState<string | null>(null);

  useEffect(() => {
    if (!contents?.sections.length) {
      return;
    }

    const onScroll = () => {
      const cutoffPoint = window.innerHeight / 4;
      const sectionsReversed = [...contents.sections].reverse();
      for (const section of sectionsReversed) {
        const element = document.getElementById(section.anchor);
        if (!element) {
          continue;
        }
        const bounds = element.getBoundingClientRect();
        const position = bounds.bottom;
        if (position && position < cutoffPoint) {
          setCurrentAnchor(section.anchor);
          return;
        }
      }
      setCurrentAnchor(null);
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [contents?.sections]);

  if (!contents?.sections.length) {
    return null;
  }

  return (
    <AnalyticsContext
      pageSectionContext="tableOfContents"
      componentName="PostTableOfContents"
    >
      <aside data-component="PostTableOfContents" className={className}>
        <nav
          aria-label="Table of Contents"
          className="
            flex flex-col gap-2 max-h-[calc(100vh-120px)] overflow-y-auto pb-12
          "
        >
          <Type>
            <Link href="#top" className="text-gray-1000">
              {title}
            </Link>
          </Type>
          <hr className="border-gray-300" />
          {contents.sections.map(({ title, anchor, level }) => (
            <Type
              key={anchor}
              cssStyle={{ "--anchor-level": String(level - 1) } as CSSProperties}
              className="pl-[calc(16px*var(--anchor-level))]"
            >
              <Link
                href={`#${anchor}`}
                className={
                  anchor === currentAnchor
                    ? "text-gray-900 after:content-['•'] after:ml-1"
                    : "text-gray-600 hover:text-gray-900"
                }
              >
                {title}
              </Link>
            </Type>
          ))}
          {commentCount && (
            <>
              <hr className="border-gray-300" />
              <Type>
                <Link href="#comments" className="text-gray-600 hover:text-gray-900">
                  {commentCount} comment{commentCount === 1 ? "" : "s"}
                </Link>
              </Type>
            </>
          )}
        </nav>
      </aside>
    </AnalyticsContext>
  );
}

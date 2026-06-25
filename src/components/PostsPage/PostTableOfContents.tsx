"use client";

import { useEffect, CSSProperties, MouseEvent, useState } from "react";
import type { TableOfContents } from "@/lib/revisions/htmlToTableOfContents";
import { POST_COMMENTS_ANCHOR, POST_TOP_ANCHOR } from "@/lib/posts/postAnchors";
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

    // Anchors in document order, then reversed so the lowest one scrolled past
    // the cutoff wins. This relies on the comments header rendering after every
    // body section (see PostsDisplay / CommentsSection order in PostsPage).
    const trackedAnchorsReversed = [
      ...contents.sections.map((section) => section.anchor),
      POST_COMMENTS_ANCHOR,
    ].reverse();

    const onScroll = () => {
      const cutoffPoint = window.innerHeight / 4;
      for (const anchor of trackedAnchorsReversed) {
        const element = document.getElementById(anchor);
        if (!element) {
          continue;
        }
        const bounds = element.getBoundingClientRect();
        const position = bounds.bottom;
        if (position && position < cutoffPoint) {
          setCurrentAnchor(anchor);
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

  const linkClassName = (
    isActive: boolean,
    activeClassName = "text-gray-900 after:content-['•'] after:ml-1",
  ) => (isActive ? activeClassName : "text-gray-600 hover:text-gray-900");

  const onAnchorClick =
    (anchor: string) => (event: MouseEvent<HTMLAnchorElement>) => {
      const element = document.getElementById(anchor);
      if (!element) {
        return;
      }
      event.preventDefault();
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      element.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
      // Move focus to the target so keyboard / screen-reader users continue
      // from the section rather than the ToC link; preventScroll avoids
      // fighting the smooth scroll above.
      element.setAttribute("tabindex", "-1");
      element.focus({ preventScroll: true });
      history.pushState(null, "", `#${anchor}`);
    };

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
            <Link
              href={`#${POST_TOP_ANCHOR}`}
              onClick={onAnchorClick(POST_TOP_ANCHOR)}
              className={linkClassName(currentAnchor === null, "text-gray-1000")}
            >
              {title}
            </Link>
          </Type>
          <hr className="border-gray-300" />
          {contents.sections.map(({ title, anchor, level }) => (
            <Type
              key={anchor}
              cssStyle={{ "--anchor-level": level } as CSSProperties}
              className="pl-[calc(16px*var(--anchor-level))]"
            >
              <Link
                href={`#${anchor}`}
                onClick={onAnchorClick(anchor)}
                className={linkClassName(anchor === currentAnchor)}
              >
                {title}
              </Link>
            </Type>
          ))}
          {commentCount > 0 && (
            <>
              <hr className="border-gray-300" />
              <Type>
                <Link
                  href={`#${POST_COMMENTS_ANCHOR}`}
                  onClick={onAnchorClick(POST_COMMENTS_ANCHOR)}
                  className={linkClassName(currentAnchor === POST_COMMENTS_ANCHOR)}
                >
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

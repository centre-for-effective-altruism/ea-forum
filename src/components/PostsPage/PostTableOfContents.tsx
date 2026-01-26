import type { CSSProperties } from "react";
import type { TableOfContents } from "@/lib/revisions/htmlToTableOfContents";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import clsx from "clsx";
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
  if (!contents?.sections.length) {
    return null;
  }
  return (
    <AnalyticsContext
      pageSectionContext="tableOfContents"
      componentName="PostTableOfContents"
    >
      <aside
        data-component="PostTableOfContents"
        className={clsx("w-[260px]", className)}
      >
        <nav aria-label="Table of Contents" className="flex flex-col gap-2">
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
              className="pl-[calc(var(--spacing)*var(--anchor-level))]"
            >
              <Link
                href={`#${anchor}`}
                className="text-gray-600 hover:text-gray-900"
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

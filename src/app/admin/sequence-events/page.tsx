import type { Metadata } from "next";
import { fetchSequenceEventPages } from "@/lib/sequences/sequenceEventPageQueries";
import {
  scalingSeriesEvent,
  sequenceEventPagePath,
} from "@/lib/sequences/sequenceEvents";
import Button from "@/components/Button";
import Link from "@/components/Link";
import Type from "@/components/Type";

export const metadata: Metadata = {
  title: "Series pages",
};

export default async function AdminSequenceEventsPage() {
  const pages = await fetchSequenceEventPages();
  return (
    <div
      data-component="AdminSequenceEventsPage"
      className="w-[732px] max-w-full mx-auto my-10 px-2 flex flex-col gap-6"
    >
      <div>
        <Type style="sectionTitleLarge">Series pages</Type>
        <Type style="bodySmall" className="text-gray-600 mt-1">
          A series page is a standalone page for one sequence, in its own colours.
          The heading and blurb come from the sequence itself, so edit the sequence
          to change those.
        </Type>
      </div>
      <div>
        <Button href="/admin/sequence-events/new">Create new series page</Button>
      </div>
      <section className="flex flex-col gap-3">
        {pages.length === 0 && <Type>No series pages yet</Type>}
        {pages.map((page) => (
          <div
            key={page.slug}
            className="
              flex items-center gap-4 border-1 border-gray-200 rounded
              bg-panel-background p-4
            "
          >
            <div
              aria-hidden
              style={{ background: page.themeColor, color: page.textColor }}
              className="w-10 h-10 rounded shrink-0 flex items-center justify-center"
            >
              Aa
            </div>
            <div className="grow min-w-0">
              <Type style="bodyHeavy" className="truncate">
                {page.title || page.slug}
              </Type>
              <Type style="bodySmall" className="text-gray-600">
                {sequenceEventPagePath(page.slug)}
                {page.published ? "" : " — unpublished"}
              </Type>
            </div>
            <Type style="bodyHeavy" className="flex gap-4 shrink-0">
              <Link
                href={sequenceEventPagePath(page.slug)}
                className="text-primary-dark hover:text-primary"
                openInNewTab
              >
                View
              </Link>
              <Link
                href={`/admin/sequence-events/${page.slug}`}
                className="text-primary-dark hover:text-primary"
              >
                Edit
              </Link>
            </Type>
          </div>
        ))}
      </section>
      <Type style="bodySmall" className="text-gray-600">
        The Scaling Series page is built in code rather than here, and lives at{" "}
        <Link
          href={scalingSeriesEvent.path}
          className="text-primary-dark hover:text-primary"
          openInNewTab
        >
          {scalingSeriesEvent.path}
        </Link>
        . Pages made here live under <code>/series/</code>; giving one a top-level
        URL like that needs a developer.
      </Type>
    </div>
  );
}

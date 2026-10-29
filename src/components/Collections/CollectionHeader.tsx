import type { ReactNode } from "react";
import type { HandbookCollection } from "@/lib/collections/handbookQueries";
import PostBody from "../ContentStyles/PostBody";
import Button from "../Button";
import Type from "../Type";

export default function CollectionHeader({
  collection: { title, html, hideStartReadingButton, firstPageLink },
  editControls,
}: Readonly<{
  collection: HandbookCollection;
  editControls?: ReactNode;
}>) {
  return (
    <section
      data-component="CollectionHeader"
      className="rounded bg-gray-0 p-6 sm:p-9 flex flex-col gap-6"
    >
      <div className="flex items-start justify-between gap-4">
        <Type style="postsPageTitle" As="h1" id="top" className="scroll-mt-20">
          {title}
        </Type>
        {editControls && <div className="shrink-0">{editControls}</div>}
      </div>
      {html && <PostBody html={html} />}
      {!hideStartReadingButton && firstPageLink && (
        <Button href={firstPageLink} className="self-start">
          Start Reading
        </Button>
      )}
    </section>
  );
}

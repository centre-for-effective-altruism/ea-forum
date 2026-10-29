import type { ReactNode } from "react";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import type { HandbookPageData } from "@/lib/collections/handbookQueries";
import CollectionTableOfContents from "./CollectionTableOfContents";
import CollectionHeader from "./CollectionHeader";
import HandbookColumn from "./HandbookColumn";
import BookSection from "./BookSection";

export default function HandbookPage({
  data: { collection, book },
  collectionEditControls,
  bookEditControls,
}: Readonly<{
  data: HandbookPageData;
  collectionEditControls?: ReactNode;
  bookEditControls?: ReactNode;
}>) {
  return (
    <div
      data-component="HandbookPage"
      className="px-4 sm:px-2 pt-8 sm:pt-12 md:pt-16 pb-16"
    >
      <HandbookColumn
        left={
          <div
            className="
              sticky left-0 top-18 pl-8 pt-5 pb-12
              max-h-[calc(100vh-72px)] overflow-y-auto
            "
          >
            <CollectionTableOfContents
              title={collection.title}
              book={book}
              className="[&_nav]:max-h-none [&_nav]:overflow-visible [&_nav]:pb-0"
            />
          </div>
        }
      >
        <div className="flex flex-col gap-8">
          <CollectionHeader
            collection={collection}
            editControls={collectionEditControls}
          />
          {book && (
            <AnalyticsContext pageSectionContext="handbookBook">
              <BookSection book={book} editControls={bookEditControls} />
            </AnalyticsContext>
          )}
        </div>
      </HandbookColumn>
    </div>
  );
}

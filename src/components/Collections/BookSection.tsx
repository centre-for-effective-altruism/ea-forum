import type { ReactNode } from "react";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import type { HandbookBook } from "@/lib/collections/handbookQueries";
import LargeSequenceItem from "./LargeSequenceItem";
import BookProgressBar from "./BookProgressBar";
import SectionTitle from "../SectionTitle";
import PostBody from "../ContentStyles/PostBody";
import Type from "../Type";

export default function BookSection({
  book,
  editControls,
}: Readonly<{
  book: HandbookBook;
  editControls?: ReactNode;
}>) {
  const { _id, title, subtitle, html, hideProgressBar, sequences } = book;
  return (
    <section
      data-component="BookSection"
      className="rounded bg-gray-0 p-6 sm:p-9 flex flex-col gap-4"
    >
      <SectionTitle
        title={title}
        anchor={_id}
        large
        noTopMargin
        noBottomMargin
        titleClassName="text-[24px]! leading-[30px]! scroll-mt-20"
        rootClassName="gap-4"
      >
        {editControls}
      </SectionTitle>
      {subtitle && (
        <Type style="bodyLarge" className="italic text-gray-600">
          {subtitle}
        </Type>
      )}
      {html && <PostBody html={html} />}
      {!hideProgressBar && (
        <AnalyticsContext pageElementContext="booksProgressBar">
          <BookProgressBar sequences={sequences} />
        </AnalyticsContext>
      )}
      <div className="flex flex-col gap-6 mt-4">
        {sequences.map((sequence) => (
          <LargeSequenceItem key={sequence._id} sequence={sequence} />
        ))}
      </div>
    </section>
  );
}

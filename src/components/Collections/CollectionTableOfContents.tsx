import type { TableOfContents } from "@/lib/revisions/htmlToTableOfContents";
import type { HandbookBook } from "@/lib/collections/handbookQueries";
import PostTableOfContents from "../PostsPage/PostTableOfContents";

export default function CollectionTableOfContents({
  title,
  book,
  className,
}: Readonly<{
  title: string;
  book: HandbookBook | null;
  className?: string;
}>) {
  const bookTitle = book?.tocTitle || book?.title;
  const contents: TableOfContents = {
    html: "",
    sections: book
      ? [
          ...(bookTitle ? [{ title: bookTitle, anchor: book._id, level: 1 }] : []),
          ...book.sequences.flatMap(({ _id, title }) =>
            title ? [{ title, anchor: _id, level: 2 }] : [],
          ),
        ]
      : [],
  };
  return (
    <PostTableOfContents
      title={title}
      contents={contents}
      commentCount={0}
      className={className}
    />
  );
}

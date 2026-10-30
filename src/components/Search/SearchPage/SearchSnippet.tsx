import type { ReactNode } from "react";
import type { SearchDocument } from "@/lib/search/searchDocuments";
import {
  searchHighlightPostTag,
  searchHighlightPreTag,
} from "@/lib/search/searchPageParams";
import clsx from "clsx";
import Type from "../../Type";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getSnippetValue = (hit: SearchDocument, field: string) => {
  const snippetResult = hit._snippetResult;
  if (!isRecord(snippetResult)) {
    return undefined;
  }
  const fieldResult = snippetResult[field];
  if (!isRecord(fieldResult) || typeof fieldResult.value !== "string") {
    return undefined;
  }
  return fieldResult.value;
};

const highlightSnippet = (value: string): ReactNode[] => {
  const [leading, ...highlightedSegments] = value.split(searchHighlightPreTag);
  const nodes: ReactNode[] = [leading];
  highlightedSegments.forEach((segment, index) => {
    const [highlighted, ...trailing] = segment.split(searchHighlightPostTag);
    nodes.push(
      <mark key={index} className="bg-primary/15 text-inherit rounded-sm">
        {highlighted}
      </mark>,
      trailing.join(""),
    );
  });
  return nodes;
};

export default function SearchSnippet({
  hit,
  field,
  fallback,
  className,
}: Readonly<{
  hit: SearchDocument;
  field: string;
  fallback?: string;
  className?: string;
}>) {
  const snippet = getSnippetValue(hit, field);
  if (!snippet && !fallback) {
    return null;
  }
  return (
    <Type
      style="body"
      className={clsx("text-gray-800 line-clamp-3 break-words", className)}
    >
      {snippet ? highlightSnippet(snippet) : fallback}
    </Type>
  );
}

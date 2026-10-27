"use client";

import { useCallback } from "react";
import type { TableOfContents } from "@/lib/revisions/htmlToTableOfContents";
import { useTopicDescriptionExpansion } from "./TopicContributorHighlightProvider";
import PostTableOfContents from "../PostsPage/PostTableOfContents";
import Type from "../Type";
import Link from "../Link";

export default function TopicTocList({
  title,
  contents,
  className,
}: Readonly<{
  title: string;
  contents: TableOfContents | null;
  className?: string;
}>) {
  const { expanded, expand } = useTopicDescriptionExpansion();
  const onClickSection = useCallback(
    (anchor: string) => {
      if (!expanded) {
        expand(anchor);
      }
    },
    [expanded, expand],
  );

  const randomTopicLink = (
    <Type>
      <Link href="/topics/random" className="text-gray-600 hover:text-gray-900">
        Random topic
      </Link>
    </Type>
  );

  if (!contents?.sections.length) {
    return (
      <div data-component="TopicTocList" className={className}>
        {randomTopicLink}
      </div>
    );
  }

  return (
    <PostTableOfContents
      title={title}
      contents={contents}
      commentCount={0}
      onClickSection={onClickSection}
      footer={
        <>
          <hr className="border-gray-300" />
          {randomTopicLink}
        </>
      }
      className={className}
    />
  );
}

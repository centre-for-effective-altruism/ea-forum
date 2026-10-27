"use client";

import { useCallback, useEffect } from "react";
import { useTracking } from "@/lib/analyticsEvents";
import { useOnSearchHotkey } from "@/lib/hooks/useGlobalKeydown";
import { useUrlHash } from "@/lib/hooks/useUrlHash";
import { useTopicDescriptionExpansion } from "./TopicContributorHighlightProvider";
import TagBody from "../ContentStyles/TagBody";
import TextLinkButton from "../TextLinkButton";

export default function TopicDescriptionBody({
  tagId,
  html,
  truncatedHtml,
  className,
}: Readonly<{
  tagId: string;
  html: string;
  truncatedHtml: string | null;
  className?: string;
}>) {
  const { expanded, expand } = useTopicDescriptionExpansion();
  const { captureEvent } = useTracking();
  const hash = useUrlHash();
  const isTruncated = !!truncatedHtml && !expanded;

  const expandAll = useCallback(() => expand(), [expand]);
  useOnSearchHotkey(expandAll);

  useEffect(() => {
    const anchor = hash.slice(1);
    if (
      isTruncated &&
      anchor &&
      !truncatedHtml.includes(`id="${anchor}"`) &&
      html.includes(`id="${anchor}"`)
    ) {
      expand(anchor);
    }
  }, [hash, isTruncated, truncatedHtml, html, expand]);

  const onReadMore = useCallback(() => {
    expand();
    captureEvent("readMoreClicked", { tagId, pageSectionContext: "wikiSection" });
  }, [expand, captureEvent, tagId]);

  return (
    <div data-component="TopicDescriptionBody" className={className}>
      <TagBody html={isTruncated ? truncatedHtml : html} />
      {isTruncated && (
        <TextLinkButton className="mt-3" onClick={onReadMore}>
          Read more
        </TextLinkButton>
      )}
    </div>
  );
}

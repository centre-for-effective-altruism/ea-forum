"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTracking } from "@/lib/analyticsEvents";
import { useOnSearchHotkey } from "@/lib/hooks/useGlobalKeydown";
import { useUrlHash } from "@/lib/hooks/useUrlHash";
import { useTopicDescriptionExpansion } from "./TopicContributorHighlightProvider";
import { EXPAND_FOOTNOTES_EVENT } from "../ContentStyles/CollapsedFootnotes";
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
  const pendingFootnoteHref = useRef<string | null>(null);

  const isHiddenByTruncation = useCallback(
    (anchor: string) =>
      isTruncated &&
      !!anchor &&
      !truncatedHtml.includes(`id="${anchor}"`) &&
      html.includes(`id="${anchor}"`),
    [isTruncated, truncatedHtml, html],
  );

  const expandAll = useCallback(() => expand(), [expand]);
  useOnSearchHotkey(expandAll);

  useEffect(() => {
    const anchor = hash.slice(1);
    if (isHiddenByTruncation(anchor)) {
      expand(anchor);
    }
  }, [hash, isHiddenByTruncation, expand]);

  useEffect(() => {
    const handler = (event: Event) => {
      const href = (event as CustomEvent<string>).detail;
      if (isHiddenByTruncation(href.slice(1))) {
        pendingFootnoteHref.current = href;
        expand();
      }
    };
    window.addEventListener(EXPAND_FOOTNOTES_EVENT, handler);
    return () => window.removeEventListener(EXPAND_FOOTNOTES_EVENT, handler);
  }, [isHiddenByTruncation, expand]);

  useEffect(() => {
    if (!isTruncated && pendingFootnoteHref.current) {
      window.dispatchEvent(
        new CustomEvent(EXPAND_FOOTNOTES_EVENT, {
          detail: pendingFootnoteHref.current,
        }),
      );
      pendingFootnoteHref.current = null;
    }
  }, [isTruncated]);

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

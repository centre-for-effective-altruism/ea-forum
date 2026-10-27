import { cache } from "react";
import { load as cheerioLoad } from "cheerio";
import { htmlToTableOfContents } from "../revisions/htmlToTableOfContents";
import type { TopicPageTag } from "./tagPageQueries";

const truncationMarkerSelectors = [
  "#Further_reading",
  "#Bibliography",
  "#Related_entries",
  ".footnotes",
];

/**
 * Returns the truncated HTML of a topic description, or null if the
 * description doesn't need truncating. If `descriptionTruncationCount` is set
 * the description is truncated to that many top-level blocks, otherwise it's
 * truncated before the first "Further reading", "Bibliography", "Related
 * entries" or footnotes section. Section anchors must already have been added
 * with `htmlToTableOfContents`.
 */
export const truncateTagDescription = (
  html: string,
  descriptionTruncationCount?: number | null,
): string | null => {
  const $ = cheerioLoad(html, null, false);
  const blocks = $.root().children().toArray();
  let cutIndex = -1;
  if (descriptionTruncationCount && descriptionTruncationCount > 0) {
    cutIndex = Math.floor(descriptionTruncationCount);
  } else {
    for (const selector of truncationMarkerSelectors) {
      const marker = $(selector).get(0);
      if (marker) {
        cutIndex = blocks.findIndex(
          (block) => block === marker || $.contains(block, marker),
        );
        break;
      }
    }
  }
  if (cutIndex <= 0 || cutIndex >= blocks.length) {
    return null;
  }
  $(blocks.slice(cutIndex)).remove();
  return $.html().trim();
};

export const getTopicDescription = cache(
  (
    tag: Pick<
      TopicPageTag,
      | "htmlWithContributorAnnotations"
      | "descriptionHtml"
      | "descriptionTruncationCount"
    >,
  ) => {
    const sourceHtml =
      tag.htmlWithContributorAnnotations || tag.descriptionHtml || "";
    const tableOfContents = htmlToTableOfContents(sourceHtml);
    const html = (tableOfContents?.html ?? sourceHtml).trim();
    return {
      html,
      truncatedHtml: html
        ? truncateTagDescription(html, tag.descriptionTruncationCount)
        : null,
      tableOfContents,
    };
  },
);

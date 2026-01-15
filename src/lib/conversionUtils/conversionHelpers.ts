"server-only";

import { CheerioAPI, load as cheerioLoad } from "cheerio";
import type { Element } from "domhandler";

const isEmptyParagraphOrBreak = (elem: Element) => {
  if (elem.type === "tag" && elem.name === "p") {
    if (elem.children?.length === 0) return true;
    if (
      elem.children?.length === 1 &&
      elem.children[0]?.type === "text" &&
      elem.children[0]?.data?.trim() === ""
    )
      return true;
    return false;
  }
  if (elem.type === "tag" && elem.name === "br") return true;
  return false;
};

const removeLeadingEmptyParagraphsAndBreaks = (
  elements: Element[],
  $: CheerioAPI,
) => {
  for (const elem of elements) {
    if (isEmptyParagraphOrBreak(elem)) {
      $(elem).remove();
    } else {
      break;
    }
  }
};

export const trimLeadingAndTrailingWhiteSpace = (html: string): string => {
  const $ = cheerioLoad(`<div id="root">${html}</div>`, null, false);
  const topLevelElements = $("#root").children().get();
  // Iterate once forward until we find non-empty paragraph to trim leading
  // empty paragraphs
  removeLeadingEmptyParagraphsAndBreaks(topLevelElements, $);
  // Then iterate backwards to trim trailing empty paragraphs
  removeLeadingEmptyParagraphsAndBreaks(topLevelElements.reverse(), $);
  return $("#root").html()?.trim() || "";
};

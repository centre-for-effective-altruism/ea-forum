import { load as cheerioLoad, CheerioAPI } from "cheerio";
import type { Element } from "domhandler";
import maxBy from "lodash/maxBy";

/** Number of headings below which a table of contents won't be generated. */
const MIN_HEADINGS_FOR_TOC = 1;

/**
 * Tags which define headings. Currently <h1>-<h4>, <strong>, and <b>. Excludes
 * <h5> and <h6> because their usage in historical (HTML) wasn't as a ToC-
 * worthy heading.
 */
const headingTags = {
  h1: 1,
  h2: 2,
  h3: 3,
  h4: 4,
  // <b> and <strong> are at the same level
  strong: 7,
  b: 7,
} as const;

const headingIfWholeParagraph = new Set<keyof typeof headingTags>(["strong", "b"]);

const anchorChars =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_0123456789";
const reservedAnchorNames = new Set(["top", "comments"]);

type TableOfContentsSection = {
  title: string;
  anchor: string;
  level: number;
};

export type TableOfContents = {
  html: string;
  sections: TableOfContentsSection[];
};

/**
 * `<b>` and `<strong>` tags are considered headings if and only if they are the
 * only element within their paragraph.
 */
const tagIsWholeParagraph = ($: CheerioAPI, element: Element): boolean => {
  const parent = element.parent;
  if (!parent) {
    return false;
  }

  const elementEl = $(element);
  const siblings = $(parent).contents();

  // Check for "alien" siblings
  const alienFound = siblings.toArray().some((sibling) => {
    if (sibling === element) {
      // Is this valid
      return false;
    }
    if (sibling.type === "tag") {
      if (sibling.tagName !== element.tagName) {
        return true;
      }
      const siblingEl = $(sibling);
      if (siblingEl.text().trim() && !elementEl.has(siblingEl).length) {
        return true;
      }
    } else if (sibling.type === "text" && sibling.data?.trim()) {
      return true;
    }
    return false;
  });

  if (alienFound) {
    return false;
  }

  // Ensure all text in paragraph is within this element
  const para = elementEl.closest("p");
  return !!para.length && para.text().trim() === elementEl.text().trim();
};

/**
 * `<b>` and `<strong>` tags are headings iff they are the only thing in their
 * paragraph. Return whether the given tag name is a tag with that property
 * (ie, is `<strong>` or `<b>`). Alse see tagIsWholeParagraph.
 */
const tagIsHeadingIfWholeParagraph = (tagName: string) =>
  headingIfWholeParagraph.has(tagName as keyof typeof headingTags);

/**
 * Given the text in a heading block and a dict of anchors that have been used
 * in the post so far, generate an anchor, and return it. An anchor is a
 * URL-safe string that can be used for within-document links, and which is
 * not one of a few reserved anchor names.
 */
const titleToAnchor = (title: string, usedAnchors: Set<string>): string => {
  const sb: string[] = [];
  for (let i = 0; i < title.length; i++) {
    const ch = title.charAt(i);
    sb.push(anchorChars.indexOf(ch) >= 0 ? ch : "_");
  }

  const anchor = sb.join("");
  if (!usedAnchors.has(anchor) && !reservedAnchorNames.has(anchor)) {
    return anchor;
  }

  let anchorSuffix = 1;
  while (usedAnchors.has(anchor + anchorSuffix)) {
    anchorSuffix++;
  }
  return anchor + anchorSuffix;
};

const tagToHeadingLevel = (tagName: string): number =>
  tagName in headingTags ? headingTags[tagName as keyof typeof headingTags] : 0;

export const htmlToTableOfContents = (
  html: string | null | undefined,
): TableOfContents | null => {
  if (!html) {
    return null;
  }

  let sections: TableOfContentsSection[] = [];
  const usedAnchors = new Set<string>();
  const $ = cheerioLoad(html, null, false);
  const headingElements = $(Object.keys(headingTags).join(","));
  for (const headingElement of headingElements) {
    const element = headingElement as Element;
    const tagName = element.tagName.toLowerCase();
    if (tagIsHeadingIfWholeParagraph(tagName) && !tagIsWholeParagraph($, element)) {
      continue;
    }
    if ($(element).closest(".footnotes").length > 0) {
      break;
    }

    // Get title from element text, capped at 300 chars
    let title = $(element).text().trim();
    if (title.length > 300) {
      title = title.substring(0, 300).trim() + "...";
    }

    if (title) {
      const anchor = titleToAnchor(title, usedAnchors);
      usedAnchors.add(anchor);
      $(element).attr("id", anchor);
      sections.push({
        title: title,
        anchor: anchor,
        level: tagToHeadingLevel(tagName),
      });
    }
  }

  if (sections.length < MIN_HEADINGS_FOR_TOC) {
    return null;
  }

  // If the number of headings is excessive (>30) and will not become small
  // (<8) if the deepest heading level is dropped, and the deepest heading
  // level comes from <b>/<strong>, drop the deepest heading level
  if (sections.length > 30) {
    const deepestHeadingLevel = maxBy(sections, (h) => h.level)?.level ?? 0;
    if (deepestHeadingLevel >= 7) {
      const headingsWithoutDeepestLevel = sections.filter(
        (h) => h.level < deepestHeadingLevel,
      );
      if (headingsWithoutDeepestLevel.length < sections.length) {
        if (headingsWithoutDeepestLevel.length >= 8) {
          sections = headingsWithoutDeepestLevel;
        }
      }
    }
  }

  // Filter out unused heading levels
  const headingLevelsUsedSet = new Set<number>();
  for (const heading of sections) {
    headingLevelsUsedSet.add(heading.level);
  }
  const headingLevelsUsed = Array.from(headingLevelsUsedSet).sort();

  // Map the heading levels to consecutive numbers starting from 0
  const headingLevelMap: Record<number, number> = {};
  for (let i = 0; i < headingLevelsUsed.length; i++) {
    headingLevelMap[headingLevelsUsed[i]] = i;
  }

  for (const heading of sections) {
    heading.level = headingLevelMap[heading.level];
  }

  return { html: $.html(), sections };
};

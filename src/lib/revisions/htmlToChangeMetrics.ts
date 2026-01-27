import { diff } from "@/vendor/node-htmldiff/htmldiff";
import { Cheerio, CheerioAPI, load as cheerioLoad } from "cheerio";
import { Element } from "domhandler";
import { sanitizeHtml } from "../conversionUtils/sanitizeHtml";
// @ts-expect-error This library doesn't have types
import { Lexer } from "html-lexer";

/**
 * Tokenize HTML. Wraps around the html-lexer library to give it a conventional
 * API taking a string, rather than an awkward streaming thing.
 */
const tokenizeHtml = (html: string): [string, string][] => {
  const result: [string, string][] = [];
  const lexer = new Lexer({
    write: (token: [string, string]) => result.push(token),
    end: () => null,
  });
  lexer.write(html);
  return result;
};

/**
 * Several common characters (quotes, smart-quotes) can be represented as
 * either regular characters (maybe unicode), or as HTML entities. In some
 * historical imported wiki content they're represented as HTML entities, but
 * opening a wiki page in CkEditor and re-saving it converts them to their
 * regular-character form, creating spurious changes in the history page and
 * in chars-edited metrics.
 *
 * This function normalizes these differences away so that we can get a diff
 * that excludes these.
 *
 * Note that while this is used for change-metrics, it's not currently used
 * for attributing edits of particular chars to users, because the
 * normalization changes the string length and the attribution code is
 * sensitive to that.
 */
const normalizeHtmlForDiff = (html: string): string => {
  const tokens = tokenizeHtml(html);
  function normalizeEntity(entityStr: string): string {
    switch (entityStr) {
      case "&quot;":
        return '"';
      case "&#x201C;":
        return "“";
      case "&#x201D;":
        return "”";
      default:
        return entityStr;
    }
  }
  return tokens
    .map(([tokenType, tokenString]) => {
      if (tokenType === "charRefNamed" || tokenType === "charRefHex") {
        return normalizeEntity(tokenString);
      } else {
        return tokenString;
      }
    })
    .join("");
};

/**
 * Given an HTML diff (with <ins> and <del> tags), remove sections that don't
 * have changes to make an abridged view.
 */
const trimHtmlDiff = (html: string): string => {
  const $ = cheerioLoad(html, null, false);

  // Does HTML contain a <body> tag? If so, look at children of the body tag.
  // Otherwise look at the root.
  const bodyTags = $("body");
  const hasBodyTag = bodyTags.length > 0;
  const rootElement = hasBodyTag
    ? bodyTags
    : ($.root() as unknown as Cheerio<Element>);

  rootElement.children().each((_i, elem) => {
    const e = $(elem);
    let isInsDel = false;
    for (const node of e) {
      if (node.type === "tag") {
        if (node.tagName === "ins" || node.tagName === "del") {
          isInsDel = true;
        }
      }
    }
    if (!isInsDel && !e.find("ins").length && !e.find("del").length) {
      e.remove();
    }
  });

  return $.html();
};

/**
 * Given two HTML string `before` and `after`, returns a new HTML string comparing
 * `before` and `after`. Insertions are wrapped in an `<ins>` tag, and deletions
 * are wrapped in a `<del>` tag. If `trim` is true, also removes sections that
 * don't have changes to make an abridged view.
 */
export const diffHtml = (before: string, after: string, trim: boolean): string => {
  // Normalize unicode and &entities; so that smart quotes changing form won't
  // produce spurious differences
  const normalizedBefore = normalizeHtmlForDiff(before);
  const normalizedAfter = normalizeHtmlForDiff(after);

  // Diff the revisions
  const diffHtmlUnsafe = diff(normalizedBefore, normalizedAfter);
  const trimmed = trim ? trimHtmlDiff(diffHtmlUnsafe) : diffHtmlUnsafe;

  // Sanitize (in case node-htmldiff has any parsing glitches that would
  // otherwise lead to XSS)
  return sanitizeHtml(trimmed);
};

const countCharsInTag = (parsedHtml: CheerioAPI, tagName: string): number => {
  const instancesOfTag = parsedHtml(tagName);
  let cumulative = 0;
  for (let i = 0; i < instancesOfTag.length; i++) {
    const tag = instancesOfTag[i];
    const text = cheerioLoad(tag, null, false).text();
    cumulative += text.length;
  }
  return cumulative;
};

export type ChangeMetrics = {
  added: number;
  removed: number;
};

export const htmlToChangeMetrics = (
  oldHtml: string,
  newHtml: string,
): ChangeMetrics => {
  const htmlDiff = diff(
    normalizeHtmlForDiff(oldHtml),
    normalizeHtmlForDiff(newHtml),
  );
  const parsedHtml = cheerioLoad(htmlDiff);

  /// Given an HTML diff, where added sections are marked with <ins> and <del>
  /// tags, count the number of chars added and removed. This is used for providing
  /// a quick distinguisher between small and large changes, on revision history
  /// lists.
  const insertedChars = countCharsInTag(parsedHtml, "ins");
  const removedChars = countCharsInTag(parsedHtml, "del");

  return { added: insertedChars, removed: removedChars };
};

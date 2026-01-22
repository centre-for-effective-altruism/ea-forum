import { diff } from "@/vendor/node-htmldiff/htmldiff";
import { CheerioAPI, load as cheerioLoad } from "cheerio";
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

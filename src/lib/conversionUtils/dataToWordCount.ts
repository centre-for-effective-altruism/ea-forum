import { dataToHtml } from "./dataToHtml";
import { dataToMarkdown } from "./dataToMarkdown";

/**
 * When we calculate the word count we want to ignore footnotes. There's two
 * syntaxes for footnotes in markdown:
 *
 * ```
 * 1.  ^**[^](#fnreflexzxp4wr9h)**^
 *
 *     The contents of my footnote
 * ```
 *
 * and
 *
 * ```
 * [^1]: The contents of my footnote.
 * ```
 *
 * In both cases, the footnote must start at character 0 on the line. The
 * strategy here is just to find the first place where this occurs and then to
 * ignore to the end of the document.
 *
 * We adopt a similar strategy for ignoring appendices. We find the first header
 * tag that contains the word 'appendix' (case-insensitive), and ignore to the
 * end of the document.
 *
 * This function runs when content is saved, not when it's loaded, so it's not too
 * performance sensitive. On the flip side, updates to this function won't affect
 * existing content (without a migration) until the content is edited and resaved.
 *
 * This involves converting from whatever format the content is in to markdown to
 * do the footnote removal, then to HTML to do the appendix removal, then back to
 * markdown to count the words. Any of these steps can potentially fail (throw an
 * exception). In particular, if the post contains LaTeX which contains syntax
 * errors, that can cause a failure; and there is (currently, 2023-08-21) at least
 * one escaping bug which can cause format conversions to _introduce_ LaTeX syntax
 * errors for later conversion steps to run into. Our strategy for this is to keep
 * a running best estimate, to be returned if any step fails.
 */
export const dataToWordCount = async (
  data: string,
  type: string,
): Promise<number> => {
  let bestWordCount = 0;

  try {
    // Convert to markdown and count words by splitting spaces
    const markdown = dataToMarkdown(data, type) ?? "";
    bestWordCount = markdown.trim().split(/[\s]+/g).length;

    // Try to remove footnotes and update the count accordingly
    const withoutFootnotes = markdown
      .split(/^1\. {2}\^\*\*\[\^\]\(#(.|\n)*/m)[0]
      .split(/^\[\^1\]:.*/m)[0];

    // Sanity check: if removing footnotes lowered the word count by over 60%,
    // we might have removed too much.
    const wordCountWithoutFootnotes = withoutFootnotes.trim().split(/[\s]+/g).length;
    if (wordCountWithoutFootnotes < bestWordCount * 0.4) {
      return bestWordCount;
    }
    bestWordCount = wordCountWithoutFootnotes;

    // Convert to HTML and try removing appendixes
    const htmlWithoutFootnotes =
      (await dataToHtml(withoutFootnotes, "markdown", {
        skipMathjax: true,
      })) ?? "";
    const htmlWithoutFootnotesAndAppendices = htmlWithoutFootnotes.split(
      /<h[1-6]>.*(appendix).*<\/h[1-6]>/i,
    )[0];
    const markdownWithoutFootnotesAndAppendices = dataToMarkdown(
      htmlWithoutFootnotesAndAppendices,
      "html",
    );
    bestWordCount = markdownWithoutFootnotesAndAppendices
      .trim()
      .split(/[\s]+/g).length;
  } catch (err) {
    console.error("Error in dataToWordCount", err);
  }

  return bestWordCount;
};

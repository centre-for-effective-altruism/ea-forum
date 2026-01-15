import "server-only";
import TurndownService from "turndown";
// @ts-expect-error This library doesn't have types
import { gfm } from "turndown-plugin-gfm";

let _turndownService: TurndownService | null = null;

export const getTurndown = (): TurndownService => {
  if (!_turndownService) {
    const turndownService: TurndownService = new TurndownService({
      headingStyle: "atx", // Use # for headings
    });
    // Add support for strikethrough and tables
    turndownService.use(gfm);
    // Make sure we don't add the content of style tags to the markdown
    turndownService.remove("style");
    turndownService.addRule("footnote-ref", {
      filter: (node) => node.classList?.contains("footnote-reference"),
      replacement: (_content, node) => {
        // Use the data-footnote-id attribute to get the footnote id
        const id =
          (node as Element).getAttribute("data-footnote-id") || "MISSING-ID";
        return `[^${id}]`;
      },
    });

    turndownService.addRule("footnote", {
      filter: (node) => node.classList?.contains("footnote-item"),
      replacement: (_content, node) => {
        // Use the data-footnote-id attribute to get the footnote id
        const id =
          (node as Element).getAttribute("data-footnote-id") || "MISSING-ID";

        // Get the content of the footnote by getting the content of the
        // footnote-content div
        const text =
          (node as Element).querySelector(".footnote-content")?.textContent || "";
        return `[^${id}]: ${text} \n\n`;
      },
    });
    turndownService.addRule("subscript", {
      filter: ["sub"],
      replacement: (content) => `~${content}~`,
    });
    turndownService.addRule("supscript", {
      filter: ["sup"],
      replacement: (content) => `^${content}^`,
    });
    turndownService.addRule("italic", {
      filter: ["i"],
      replacement: (content) => `*${content}*`,
    });
    //If we have a math-tex block, we want to leave it as is without escaping it
    turndownService.addRule("latex-spans", {
      filter: (node) => node.classList?.contains("math-tex"),
      replacement: (content) => {
        // Leave the first three and last three characters alone, and then
        // replace every escaped markdown control character with its unescaped
        // version
        return (
          content.slice(0, 3) +
          content
            .slice(3, -3)
            .replace(/\\([ \\!"#$%&'()*+,./:;<=>?@[\]^_`{|}~-])/g, "$1") +
          content.slice(-3)
        );
      },
    });

    turndownService.addRule("collapsible-section-start", {
      filter: (node) => node.classList?.contains("detailsBlockTitle"),
      replacement: (content) => `+++ ${content.trim()}\n`,
    });
    turndownService.addRule("collapsible-section-end", {
      filter: (node) => node.classList?.contains("detailsBlock"),
      replacement: (content) => `${content}\n+++`,
    });
    _turndownService = turndownService;
  }
  return _turndownService;
};

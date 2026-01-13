"server-only";

import type { EditorTypeString } from "../ckeditor/editorHelpers";
import { sanitizeHtml } from "./sanitizeHtml";
import { processMathjax } from "./mathjax";
import { markdownToHtml } from "./markdownToHtml";
import { trimLeadingAndTrailingWhiteSpace } from "./conversionHelpers";

export const dataToHtml = async (
  data: string,
  type: EditorTypeString,
  options?: {
    sanitize?: boolean;
    skipMathjax?: boolean;
  },
) => {
  switch (type) {
    case "html": {
      const maybeSanitized = options?.sanitize ? sanitizeHtml(data) : data;
      if (options?.skipMathjax) {
        return maybeSanitized;
      }
      return processMathjax(maybeSanitized);
    }
    case "ckEditorMarkup": {
      const html = sanitizeHtml(data); // Sanitized CKEditor markup is just html
      const trimmedHtml = trimLeadingAndTrailingWhiteSpace(html);
      // TODO: ForumMagnum has a callback here to handle dialogue HTML
      if (options?.skipMathjax) {
        return Promise.resolve(trimmedHtml);
      }
      return processMathjax(trimmedHtml);
    }
    case "markdown":
      return markdownToHtml(data, { skipMathjax: options?.skipMathjax });
    default:
      throw new Error(`Unrecognized editor type: ${type}`);
  }
};

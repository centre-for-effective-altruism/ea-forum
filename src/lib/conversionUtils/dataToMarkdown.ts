import "server-only";
import { sanitizeHtml } from "./sanitizeHtml";
import { getTurndown } from "./turndown";

export const dataToMarkdown = (data: string, type: string) => {
  if (!data) {
    return "";
  }
  switch (type) {
    case "markdown":
      return data;
    case "html":
      return getTurndown().turndown(data);
    case "ckEditorMarkup":
      return getTurndown().turndown(sanitizeHtml(data));
    default:
      throw new Error(`Unrecognized format: ${type}`);
  }
};

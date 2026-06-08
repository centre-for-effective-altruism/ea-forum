import type { Revision } from "../schema";

export type PangramRevision = Pick<
  Revision,
  | "_id"
  | "pangramAiScore"
  | "pangramCheckedAt"
  | "pangramStatus"
  | "pangramRawResponse"
>;

export type PangramV3Response = {
  headline?: string | null;
  prediction?: string | null;
  prediction_short?: string | null;
  fraction_ai?: number | null;
  fraction_ai_assisted?: number | null;
  fraction_human?: number | null;
  _truncated?: boolean | null;
  _originalCharCount?: number | null;
};

export const PANGRAM_MAX_CHARS_DISPLAY = 50_000;

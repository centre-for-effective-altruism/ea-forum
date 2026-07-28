import type { Revision } from "../schema";

export type PangramRevision = Pick<
  Revision,
  "_id" | "pangramAiScore" | "pangramCheckedAt" | "pangramStatus"
> &
  Partial<Pick<Revision, "pangramRawResponse">>;

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
/**
 * Pangram's accuracy drops sharply on very short text; 50 words is their
 * recommended floor
 */
export const PANGRAM_MIN_WORDS = 50;
/** Pangram v3 rejects overlong payloads; we truncate rather than error out */
export const PANGRAM_MAX_CHARS = 50_000;
/** Pangram v3 calls typically return in 1–3s; 30s leaves headroom for tail latency */
export const PANGRAM_TIMEOUT_MS = 30_000;

export type PangramStatus = "scored" | "too_short" | "skipped_spam" | "error";

export type PangramResult = {
  status: PangramStatus;
  aiScore: number | null;
  rawResponse: unknown | null;
};

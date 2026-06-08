import type { CurrentUser } from "../users/currentUser";
import { recordPangramSkip, writePangramResultToRevision } from "./pangramQueries";
import { userIsAdminOrMod } from "../users/userHelpers";
import { htmlToTextDefault } from "../utils/htmlToText";
import { db } from "../db";
import {
  PANGRAM_MAX_CHARS,
  PANGRAM_MIN_WORDS,
  PANGRAM_TIMEOUT_MS,
  PangramResult,
  PangramStatus,
  PangramV3Response,
} from "./pangramHelpers";

const documentIsEligibleForPangram = (document: {
  deleted?: boolean | null;
  deletedDraft?: boolean | null;
  rejected?: boolean | null;
  spam?: boolean | null;
  draft?: boolean | null;
}): { eligible: boolean; skipStatus?: PangramStatus } => {
  // Spam/deleted: terminal states — record a skip so the badge shows "skipped"
  // instead of sitting at "pending" forever.
  if (document.spam || document.deleted || document.deletedDraft) {
    return { eligible: false, skipStatus: "skipped_spam" };
  }
  // Rejected/draft: reversible — deliberately do NOT record, so the badge stays
  // "pending" and re-evaluates if the doc is un-rejected or published.
  if (document.rejected || document.draft) {
    return { eligible: false };
  }
  return { eligible: true };
};

const extractPangramInput = (
  html: string | null | undefined,
  title: string | null,
): string => {
  const body = htmlToTextDefault(html ?? "");
  return title ? `${title ?? ""}\n\n${body}`.trim() : body.trim();
};

const countWords = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

const makePangramRequest = async (
  apiKey: string,
  text: string,
): Promise<PangramResult> => {
  const wasTruncated = text.length > PANGRAM_MAX_CHARS;
  const truncated = wasTruncated ? text.slice(0, PANGRAM_MAX_CHARS) : text;

  try {
    const response = await fetch("https://text.api.pangram.com/v3", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ text: truncated }),
      signal: AbortSignal.timeout(PANGRAM_TIMEOUT_MS),
    });

    const rawResponse = (await response
      .json()
      .catch(() => null)) as PangramV3Response | null;

    if (!response.ok) {
      return {
        status: "error",
        aiScore: null,
        rawResponse: { status: response.status, body: rawResponse },
      };
    }

    // v3 returns fraction_ai (0..1): proportion of content classified as AI-generated.
    const aiScore: number | null =
      typeof rawResponse?.fraction_ai === "number" ? rawResponse.fraction_ai : null;

    // Underscore-prefixed so they can't collide with Pangram's own fields if
    // they ever add one.
    const annotatedResponse: PangramV3Response | null =
      rawResponse && wasTruncated
        ? { ...rawResponse, _truncated: true, _originalCharCount: text.length }
        : rawResponse;

    return {
      status: aiScore === null ? "error" : "scored",
      aiScore,
      rawResponse: annotatedResponse,
    };
  } catch (err) {
    return {
      status: "error",
      aiScore: null,
      rawResponse: { error: String(err) },
    };
  }
};

export const runPangramOnRevision = async (
  currentUser: CurrentUser,
  revisionId: string,
): Promise<PangramResult> => {
  if (!userIsAdminOrMod(currentUser)) {
    throw new Error("Only admins and moderators can run Pangram");
  }

  const apiKey = process.env.PANGRAM_API_KEY;
  if (!apiKey) {
    return await writePangramResultToRevision(revisionId, {
      status: "error",
      aiScore: null,
      rawResponse: { error: "not_configured" },
    });
  }

  const revision = await db.query.revisions.findFirst({
    columns: {
      _id: true,
      html: true,
    },
    with: {
      post: {
        columns: {
          _id: true,
          title: true,
          deletedDraft: true,
          rejected: true,
          draft: true,
        },
      },
      comment: {
        columns: {
          _id: true,
          deleted: true,
          rejected: true,
          spam: true,
          draft: true,
        },
      },
    },
    where: {
      _id: revisionId,
    },
  });
  if (!revision) {
    throw new Error("Revision not found");
  }

  const document = revision.post || revision.comment;
  if (!document) {
    throw new Error("Revision document not found");
  }

  const eligibility = documentIsEligibleForPangram(document);
  if (!eligibility.eligible) {
    if (eligibility.skipStatus) {
      await recordPangramSkip(revisionId, eligibility.skipStatus);
      return { status: eligibility.skipStatus, aiScore: null, rawResponse: null };
    }
    throw new Error(`Document is not eligible for Pangram (draft or rejected)`);
  }

  const text = extractPangramInput(
    revision.html,
    "title" in document ? document.title : null,
  );

  if (countWords(text) < PANGRAM_MIN_WORDS) {
    return await writePangramResultToRevision(revisionId, {
      status: "too_short",
      aiScore: null,
      rawResponse: null,
    });
  }

  const result = await makePangramRequest(apiKey, text);
  return await writePangramResultToRevision(revisionId, result);
};

import type { PangramResult, PangramStatus } from "./pangramHelpers";
import { revisions } from "../schema";
import { eq } from "drizzle-orm";
import { db } from "../db";

export const writePangramResultToRevision = async (
  revisionId: string,
  result: PangramResult,
): Promise<PangramResult> => {
  await db
    .update(revisions)
    .set({
      pangramAiScore: result.aiScore,
      pangramStatus: result.status,
      pangramCheckedAt: new Date().toISOString(),
      pangramRawResponse: result.rawResponse ?? null,
    })
    .where(eq(revisions._id, revisionId));
  return result;
};

export const recordPangramSkip = async (
  revisionId: string,
  status: PangramStatus,
) => {
  await writePangramResultToRevision(revisionId, {
    status,
    aiScore: null,
    rawResponse: null,
  });
};

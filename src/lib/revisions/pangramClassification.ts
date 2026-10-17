import { TupleSet, UnionOf } from "../typeHelpers";

const pangramClassifications = new TupleSet([
  "entirely-ai",
  "mostly-ai",
  "partly-ai",
  "human",
] as const);

export type PangramClassification = UnionOf<typeof pangramClassifications>;

export type PangramScoredRevision = {
  pangramStatus: string | null;
  pangramAiScore: number | null;
  pangramAssistedScore: number | null;
  pangramHumanScore: number | null;
};

const getHumanFraction = (revision: PangramScoredRevision | null): number | null => {
  if (!revision || revision.pangramStatus !== "scored") {
    return null;
  }
  if (typeof revision.pangramHumanScore === "number") {
    return revision.pangramHumanScore;
  }
  if (typeof revision.pangramAiScore === "number") {
    return 1 - revision.pangramAiScore;
  }
  return null;
};

export const classifyPangramRevision = (
  revision: PangramScoredRevision | null,
  override?: string | null,
): PangramClassification | null => {
  if (override && pangramClassifications.has(override)) {
    return override;
  }
  const humanFraction = getHumanFraction(revision);
  if (humanFraction === null) {
    return null;
  }
  if (humanFraction <= 0.01) {
    return "entirely-ai";
  }
  if (humanFraction < 0.5) {
    return "mostly-ai";
  }
  if (humanFraction < 0.9) {
    return "partly-ai";
  }
  return "human";
};

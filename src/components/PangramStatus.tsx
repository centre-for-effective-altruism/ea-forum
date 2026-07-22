import clsx from "clsx";
import { formatPercent } from "@/lib/formatHelpers";
import Tooltip from "./Tooltip";
import Type from "./Type";
import Link from "./Link";

type ScoredRevision = {
  pangramAiScore: number | null;
  pangramAssistedScore: number | null;
  pangramHumanScore: number | null;
};

type PangramClassification = {
  label: string;
  className: string;
  aiScore: number;
  assistedScore: number | null;
  humanScore: number | null;
};

export const classifyPangramScore = (
  revision: ScoredRevision | null,
): PangramClassification | null => {
  if (!revision || typeof revision.pangramAiScore !== "number") {
    return null;
  }
  const scores = {
    aiScore: revision.pangramAiScore,
    assistedScore: revision.pangramAssistedScore,
    humanScore: revision.pangramHumanScore,
  };
  if (scores.aiScore >= 0.99) {
    return {
      label: "~Entirely AI-written",
      className: "bg-pangram-high-bg text-pangram-high-fg border-pangram-high-hl",
      ...scores,
    };
  }
  if (scores.aiScore > 0.5) {
    return {
      label: "Mostly AI-written",
      className: "bg-pangram-med-bg text-pangram-med-fg border-pangram-med-hl",
      ...scores,
    };
  }
  if (scores.aiScore > 0.1) {
    return {
      label: "Partly AI-written",
      className: "bg-pangram-low-bg text-pangram-low-fg border-pangram-low-hl",
      ...scores,
    };
  }
  return null;
};

export default function PangramStatus({
  revision,
  classification,
}: Readonly<{
  revision?: ScoredRevision | null;
  classification?: PangramClassification | null;
}>) {
  if (revision && !classification) {
    classification = classifyPangramScore(revision);
  }
  if (!classification) {
    return null;
  }
  const { label, className, aiScore, assistedScore, humanScore } = classification;
  const hasFractions =
    typeof aiScore === "number" &&
    typeof assistedScore === "number" &&
    typeof humanScore === "number";
  return (
    <Tooltip
      title={
        <Type style="bodySmall" className="text-center">
          {hasFractions ? (
            <>
              <div>Assigned based on a Pangram score of:</div>
              <div>{formatPercent(aiScore)} AI</div>
              <div>{formatPercent(assistedScore)} Assisted</div>
              <div>{formatPercent(humanScore)} Human</div>
            </>
          ) : (
            <div>Assigned via Pangram</div>
          )}
          <div>Click for more details</div>
        </Type>
      }
      className="inline-block -translate-y-px"
    >
      <Link
        data-component="PangramStatus"
        href="/posts/bxA9fsY9Psgarcq6e/new-ea-forum-llm-use-policy"
        className={clsx(
          "inline-block border-1 rounded-[100px] px-2 py-0.5",
          "cursor-pointer font-sans text-[11px] leading-none",
          className,
        )}
      >
        {label}
      </Link>
    </Tooltip>
  );
}

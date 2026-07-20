import { ReactNode } from "react";
import clsx from "clsx";
import { formatPercent } from "@/lib/formatHelpers";
import Tooltip from "./Tooltip";
import Type from "./Type";
import Link from "./Link";

const PANGRAM_INFO_HREF = "/posts/bxA9fsY9Psgarcq6e/new-ea-forum-llm-use-policy";

type ScoredRevision = {
  pangramStatus: string | null;
  pangramAiScore: number | null;
  pangramAssistedScore: number | null;
  pangramHumanScore: number | null;
};

type PangramLabel = {
  label: string;
  className: string;
};

// The human-written fraction (0..1) for a scored revision, or null if it hasn't
// been scored. Prefers Pangram v3's fraction_human; older rows that only stored
// an AI score fall back to 1 - AI (pre-v3 had no "assisted" bucket, so non-AI is
// human). Keying off pangramStatus keeps the label sticky for every scored post
// — it only clears when an edit produces a new, not-yet-scored revision.
const getHumanFraction = (revision: ScoredRevision | null): number | null => {
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

// Labelling is based on the human fraction: the more human-written the content,
// the less it's flagged. >=90% human gets no AI label (rendered as "Scanned");
// below that, a lower human fraction escalates the label.
const classifyHumanFraction = (humanFraction: number): PangramLabel | null => {
  if (humanFraction <= 0.01) {
    return {
      label: "~Entirely AI-written",
      className: "bg-pangram-high-bg text-pangram-high-fg border-pangram-high-hl",
    };
  }
  if (humanFraction < 0.5) {
    return {
      label: "Mostly AI-written",
      className: "bg-pangram-med-bg text-pangram-med-fg border-pangram-med-hl",
    };
  }
  if (humanFraction < 0.9) {
    return {
      label: "Partly AI-written",
      className: "bg-pangram-low-bg text-pangram-low-fg border-pangram-low-hl",
    };
  }
  return null;
};

export default function PangramStatus({
  revision,
}: Readonly<{
  revision?: ScoredRevision | null;
}>) {
  const rev = revision ?? null;
  const humanFraction = getHumanFraction(rev);

  let content: ReactNode = null;
  if (humanFraction !== null) {
    const label = classifyHumanFraction(humanFraction);
    if (label) {
      // Show the ai/assisted/human breakdown only when all three are stored
      // (Pangram v3); pre-v3 rows fall back to a plain tooltip.
      const aiScore = rev?.pangramAiScore ?? null;
      const assistedScore = rev?.pangramAssistedScore ?? null;
      const humanScore = rev?.pangramHumanScore ?? null;
      const hasFractions =
        typeof aiScore === "number" &&
        typeof assistedScore === "number" &&
        typeof humanScore === "number";
      content = (
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
            href={PANGRAM_INFO_HREF}
            className={clsx(
              "inline-block border-1 rounded-[100px] px-2 py-0.5",
              "cursor-pointer font-sans text-[11px] leading-none",
              label.className,
            )}
          >
            {label.label}
          </Link>
        </Tooltip>
      );
    } else {
      // Scored and >=90% human-written: no AI label, just a subtle "Scanned" note.
      content = (
        <Tooltip
          title={
            <Type style="bodySmall" className="text-center">
              <div>Scanned with Pangram, more than 90% human-written</div>
              <div>Click for more information</div>
            </Type>
          }
          className="inline-block"
        >
          <Link
            data-component="PangramStatus"
            href={PANGRAM_INFO_HREF}
            className="text-gray-400 cursor-pointer hover:opacity-70"
          >
            Scanned
          </Link>
        </Tooltip>
      );
    }
  }

  if (!content) {
    return null;
  }

  return (
    <>
      <span aria-hidden className="mx-1.5">
        ·
      </span>
      {content}
    </>
  );
}

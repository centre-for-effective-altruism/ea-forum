import clsx from "clsx";
import { formatPercent } from "@/lib/formatHelpers";
import Tooltip from "./Tooltip";
import Type from "./Type";
import Link from "./Link";

type PangramClassification = {
  label: string;
  className: string;
};

export const classifyPangramScore = (
  score: number,
): PangramClassification | null => {
  if (score >= 0.99) {
    return {
      label: "~Entirely AI-written",
      className: "bg-pangram-high-bg text-pangram-high-fg border-pangram-high-hl",
    };
  }
  if (score > 0.5) {
    return {
      label: "Mostly AI-written",
      className: "bg-pangram-med-bg text-pangram-med-fg border-pangram-med-hl",
    };
  }
  if (score > 0.1) {
    return {
      label: "Partly AI-written",
      className: "bg-pangram-low-bg text-pangram-low-fg border-pangram-low-hl",
    };
  }
  return null;
};

export default function PangramStatus({
  score,
  classification,
  fractionAi,
  fractionAssisted,
  fractionHuman,
}: Readonly<{
  score?: number;
  classification?: PangramClassification | null;
  fractionAi?: number | null;
  fractionAssisted?: number | null;
  fractionHuman?: number | null;
}>) {
  if (typeof score === "number" && !classification) {
    classification = classifyPangramScore(score);
  }
  if (!classification) {
    return null;
  }
  const { label, className } = classification;
  const hasFractions =
    typeof fractionAi === "number" &&
    typeof fractionAssisted === "number" &&
    typeof fractionHuman === "number";
  return (
    <Tooltip
      title={
        <Type style="bodySmall" className="text-center">
          {hasFractions ? (
            <>
              <div>Assigned based on a Pangram score of:</div>
              <div>{formatPercent(fractionAi)} AI</div>
              <div>{formatPercent(fractionAssisted)} Assisted</div>
              <div>{formatPercent(fractionHuman)} Human</div>
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
          "inline-block border-1 rounded-[100px] px-2 py-0.5 font-sans text-[11px] leading-none",
          "cursor-pointer",
          className,
        )}
      >
        {label}
      </Link>
    </Tooltip>
  );
}

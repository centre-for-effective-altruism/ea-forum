import type {
  PangramClassification,
  PangramScoredRevision,
} from "@/lib/revisions/pangramClassification";
import { formatPercent } from "@/lib/formatHelpers";
import clsx from "clsx";
import Tooltip from "./Tooltip";
import Type from "./Type";
import Link from "./Link";

const PANGRAM_INFO_HREF = "/posts/bxA9fsY9Psgarcq6e/new-ea-forum-llm-use-policy";

const pangramLabels = {
  "entirely-ai": {
    label: "~Entirely AI-written",
    className: "bg-pangram-high-bg text-pangram-high-fg border-pangram-high-hl",
  },
  "mostly-ai": {
    label: "Mostly AI-written",
    className: "bg-pangram-med-bg text-pangram-med-fg border-pangram-med-hl",
  },
  "partly-ai": {
    label: "Partly AI-written",
    className: "bg-pangram-low-bg text-pangram-low-fg border-pangram-low-hl",
  },
} as const;

export default function PangramStatus({
  classification,
  revision,
}: Readonly<{
  classification: PangramClassification;
  revision?: PangramScoredRevision | null;
}>) {
  if (classification === "human") {
    return (
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
          className="text-gray-400 hover:text-gray-600"
        >
          Scanned
        </Link>
      </Tooltip>
    );
  }

  const { label, className } = pangramLabels[classification];
  const aiScore = revision?.pangramAiScore ?? null;
  const assistedScore = revision?.pangramAssistedScore ?? null;
  const humanScore = revision?.pangramHumanScore ?? null;
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
        href={PANGRAM_INFO_HREF}
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

"use client";

import { ReactNode, useCallback, useState } from "react";
import { captureException } from "@sentry/nextjs";
import {
  PANGRAM_MAX_CHARS_DISPLAY,
  PangramResult,
  PangramRevision,
  PangramV3Response,
} from "@/lib/revisions/pangramHelpers";
import { formatPercent } from "@/lib/formatHelpers";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { userIsAdminOrMod } from "@/lib/users/userHelpers";
import { rpc } from "@/lib/rpc";
import clsx from "clsx";
import Tooltip from "./Tooltip";
import TimeAgo from "./TimeAgo";
import Type from "./Type";

export default function PangramBadge({
  revision,
}: Readonly<{
  revision: PangramRevision;
}>) {
  const { currentUser } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [localResult, setLocalResult] = useState<PangramResult | null>(null);

  const status = localResult?.status ?? revision?.pangramStatus ?? null;
  const aiScore = localResult?.aiScore ?? revision?.pangramAiScore ?? null;
  const checkedAt = revision?.pangramCheckedAt ?? null;
  const raw: PangramV3Response | null =
    localResult?.rawResponse ?? revision?.pangramRawResponse ?? null;

  const fractionAi = typeof raw?.fraction_ai === "number" ? raw.fraction_ai : null;
  const fractionAssisted =
    typeof raw?.fraction_ai_assisted === "number" ? raw.fraction_ai_assisted : null;
  const fractionHuman =
    typeof raw?.fraction_human === "number" ? raw.fraction_human : null;

  const handleClick = useCallback(async () => {
    if (loading) {
      return;
    }
    setLoading(true);
    try {
      const data = await rpc.revisions.runPangram({
        revisionId: revision._id,
      });
      if (data) {
        setLocalResult(data);
      }
    } catch (e) {
      setLocalResult({ status: "error", aiScore: null, rawResponse: null });
      captureException(e);
    }
    setLoading(false);
  }, [loading, revision]);

  if (!userIsAdminOrMod(currentUser)) {
    return null;
  }

  const classNames: string[] = [];
  let body: ReactNode;
  let tooltip: ReactNode;

  if (loading) {
    classNames.push("opacity-50");
    body = (
      <>
        <span className="font-[600] mr-1">Pangram</span>…
      </>
    );
    tooltip = "Running Pangram…";
  } else if (status === "scored" && typeof aiScore === "number") {
    if (aiScore >= 0.7) {
      classNames.push("bg-pangram-high-bg text-gray-900");
    } else if (aiScore >= 0.3) {
      classNames.push("bg-pangram-mid-bg text-gray-900");
    } else {
      classNames.push("bg-pangram-low-bg text-gray-900/50");
    }
    // Fallback branch below is for rows scored under the deprecated pre-v3
    // endpoint, which only returned a single aiScore.
    const hasFractions =
      fractionAi !== null || fractionAssisted !== null || fractionHuman !== null;
    body = hasFractions ? (
      <>
        <span className="font-[600] mr-1">Pangram</span>
        <span className="font-[600] text-pangram-ai-fraction">
          {formatPercent(fractionAi)} AI
        </span>
        <span className="opacity-50 mx-[3px]">·</span>
        <span className="font-[600] text-pangram-assisted-fraction">
          {formatPercent(fractionAssisted)} Asst
        </span>
        <span className="opacity-50 mx-[3px]">·</span>
        <span className="font-[600] text-pangram-human-fraction">
          {formatPercent(fractionHuman)} Human
        </span>
      </>
    ) : (
      <>
        <span className="font-[600] mr-1">AI</span>
        {Math.round(aiScore * 100)}%
      </>
    );
    tooltip = (
      <>
        {raw?.headline && <div className="text-[600] mb-1">{raw.headline}</div>}
        {raw?.prediction && <div className="mb-1">{raw.prediction}</div>}
        {hasFractions && (
          <div className="mb-1">
            AI {formatPercent(fractionAi)} · AI-assisted{" "}
            {formatPercent(fractionAssisted)} · Human {formatPercent(fractionHuman)}
          </div>
        )}
        {raw?._truncated && (
          <div>
            <em>
              Scored on first {PANGRAM_MAX_CHARS_DISPLAY.toLocaleString()} chars
              {typeof raw._originalCharCount === "number" &&
                ` (truncated from ${raw._originalCharCount.toLocaleString()})`}
            </em>
          </div>
        )}
        {checkedAt && (
          <div>
            Checked <TimeAgo time={new Date(checkedAt)} includeAgo />
          </div>
        )}
        <div>
          <em>Click to rerun</em>
        </div>
      </>
    );
  } else if (status === "too_short") {
    classNames.push("bg-panel-background text-gray-900/50");
    body = (
      <>
        <span className="font-[600] mr-1">Pangram</span>too short
      </>
    );
    tooltip = "Text is too short for reliable AI detection. Click to rerun.";
  } else if (status === "skipped_spam") {
    classNames.push("bg-panel-background text-gray-900/50");
    body = (
      <>
        <span className="font-[600] mr-1">Pangram</span>skipped (spam)
      </>
    );
    tooltip =
      "Skipped because the content was flagged as spam. Click to run anyway.";
  } else if (status === "error") {
    classNames.push("bg-pangram-error-bg text-gray-900");
    body = (
      <>
        <span className="font-[600] mr-1">Pangram</span>error — retry
      </>
    );
    tooltip = "Pangram call failed. Click to retry.";
  } else {
    classNames.push("opacity-50");
    body = (
      <>
        <span className="font-[600] mr-1">Pangram</span>pending
      </>
    );
    tooltip = "Not yet checked. Click to run Pangram.";
  }

  return (
    <Tooltip title={tooltip ? <Type style="bodySmall">{tooltip}</Type> : null}>
      <Type
        style="bodyXXSmall"
        className={clsx(
          "inline-flex items-center py-px px-[6px] mr-[6px] rounded-sm",
          "cursor-pointer select-none border-1 border-always-black/10",
          ...classNames,
        )}
        onClick={handleClick}
      >
        {body}
      </Type>
    </Tooltip>
  );
}

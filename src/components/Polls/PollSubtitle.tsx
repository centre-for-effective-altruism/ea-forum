"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatRemainingTime } from "@/lib/utils/pollHelpers";
import clsx from "clsx";

export default function PollSubtitle({
  endDate,
  voteCount,
  hasVoted,
  resultsVisible,
  setResultsVisible,
}: Readonly<{
  endDate: Date | string | null;
  voteCount: number;
  hasVoted: boolean;
  resultsVisible: boolean;
  setResultsVisible: (visible: boolean) => void;
}>) {
  const end = useMemo(
    () => (endDate ? new Date(endDate).getTime() : null),
    [endDate],
  );
  const [remainingMs, setRemainingMs] = useState(() =>
    end ? end - Date.now() : Infinity,
  );

  useEffect(() => {
    if (!end) {
      return;
    }
    // Examples: 2 mins left, will count down in 1s increments. 2 hours left, will
    // count down in 1 min increments
    const interval = Math.max(1000, Math.floor((end - Date.now()) / 120));
    const timer = setInterval(() => setRemainingMs(end - Date.now()), interval);
    return () => clearInterval(timer);
  }, [end]);

  const showResults = useCallback(
    () => setResultsVisible(true),
    [setResultsVisible],
  );
  const hideResults = useCallback(
    () => setResultsVisible(false),
    [setResultsVisible],
  );

  const votingOpen = !end || remainingMs > 0;

  const buttonClassName = `
    bg-none text-(--forum-event-banner-text) underline underline-offset-3
    cursor-pointer hover:opacity-70
  `;

  if (resultsVisible) {
    return (
      <button
        data-component="PollSubtitle"
        onClick={hideResults}
        className={clsx(buttonClassName, "mr-4")}
      >
        Hide results
      </button>
    );
  }

  return (
    <>
      {voteCount > 0 &&
        `${voteCount} vote${voteCount === 1 ? "" : "s"}${votingOpen ? " so far" : ""}. `}
      {end &&
        (remainingMs > 0 ? (
          <>Voting closes in {formatRemainingTime(remainingMs)}. </>
        ) : (
          <>Voting has closed. </>
        ))}
      {votingOpen && (hasVoted ? "Change" : "Place") + " your vote or "}
      <button
        data-component="PollSubtitle"
        className={clsx(buttonClassName, "ml-1")}
        onClick={showResults}
      >
        {votingOpen ? "view results." : "View results."}
      </button>
    </>
  );
}

"use client";

import { useRef, ReactNode } from "react";
import { usePostReadProgress } from "@/lib/hooks/usePostReadProgress";
import type { PostDisplay } from "@/lib/posts/postQueries";

export default function ReadProgress({
  post,
  readTimeMinutes,
  children,
}: {
  post: PostDisplay;
  readTimeMinutes: number;
  children: ReactNode;
}) {
  const postBodyRef = useRef<HTMLDivElement>(null);
  const disableProgressBar =
    post.isEvent ||
    post.question ||
    post.debate ||
    post.shortform ||
    readTimeMinutes < 3;
  const { readingProgressBarRef } = usePostReadProgress({
    postBodyRef,
    updateProgressBar: (element, scrollPercent) =>
      element.style.setProperty("--scrollAmount", `${scrollPercent}%`),
    disabled: disableProgressBar,
    useFixedToCScrollCalculation: false,
  });
  return (
    <div data-component="ReadProgress" ref={postBodyRef}>
      <div
        ref={readingProgressBarRef}
        className="
          fixed top-0 left-0 h-[4px] w-(--scrollAmount) bg-primary
          z-(--zindex-read-progress) pointer-events-none
        "
      />
      {children}
    </div>
  );
}

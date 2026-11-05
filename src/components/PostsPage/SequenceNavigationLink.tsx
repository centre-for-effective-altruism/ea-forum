"use client";

import { ReactNode, useCallback } from "react";
import { captureException } from "@sentry/nextjs";
import { useCurrentUserIfLoaded } from "@/lib/hooks/useCurrentUser";
import { rpc } from "@/lib/rpc";
import Link from "../Link";

/**
 * Links to another post in a sequence, recording the user's progress so that
 * the sequence shows up in "Continue reading" on the saved page.
 */
export default function SequenceNavigationLink({
  postId,
  sequenceId,
  requestedSequenceId,
  className,
  children,
}: Readonly<{
  postId: string;
  sequenceId: string;
  requestedSequenceId?: string;
  className?: string;
  children: ReactNode;
}>) {
  const currentUser = useCurrentUserIfLoaded();
  const onClick = useCallback(() => {
    if (currentUser) {
      rpc.sequences
        .updateContinueReading({ sequenceId, postId })
        .catch(captureException);
    }
  }, [currentUser, sequenceId, postId]);
  return (
    <Link
      href={
        requestedSequenceId
          ? `/s/${requestedSequenceId}/p/${postId}`
          : `/posts/${postId}`
      }
      onClick={onClick}
      className={className}
    >
      {children}
    </Link>
  );
}

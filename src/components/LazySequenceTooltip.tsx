import { ElementType, ReactNode, useCallback, useEffect, useState } from "react";
import { rpc } from "@/lib/rpc";
import { captureException } from "@sentry/nextjs";
import type { Placement } from "@floating-ui/react";
import type { SequenceBase } from "@/lib/sequences/sequenceQueries";
import SequenceTooltip from "./SequenceTooltip";
import Tooltip from "./Tooltip";
import Loading from "./Loading";

export default function LazySequenceTooltip({
  sequenceId,
  placement,
  As = "div",
  className,
  children,
}: Readonly<{
  sequenceId: string | null;
  placement?: Placement;
  As?: ElementType;
  className?: string;
  children: ReactNode;
}>) {
  const [sequence, setSequence] = useState<SequenceBase | null>(null);
  const [everHovered, setEverHovered] = useState(false);
  const onMouseEnter = useCallback(() => setEverHovered(true), []);

  // TODO: These results should be stored in a global cache to avoid refetching
  // the same sequence multiple times
  const refetch = useCallback(async () => {
    if (!sequenceId) {
      setSequence(null);
      return;
    }
    try {
      const result = await rpc.sequences.listById({ _id: sequenceId });
      setSequence(result);
    } catch (e) {
      console.error(`Error fetching sequence ${sequenceId}:`, e);
      captureException(e);
    }
  }, [sequenceId]);

  useEffect(() => {
    setEverHovered(false);
  }, [sequenceId]);

  useEffect(() => {
    if (everHovered) {
      void refetch();
    }
  }, [everHovered, refetch]);

  if (!sequenceId) {
    return <>{children}</>;
  }

  if (sequence) {
    return (
      <SequenceTooltip
        As={As}
        placement={placement}
        className={className}
        sequence={sequence}
      >
        {children}
      </SequenceTooltip>
    );
  }

  return (
    <Tooltip
      As={As}
      placement={placement}
      className={className}
      tooltipClassName="
        bg-surface-floating! text-gray-900! p-0! shadow-lg w-[360px] max-w-full
      "
      title={<Loading />}
    >
      <As onMouseEnter={onMouseEnter}>{children}</As>
    </Tooltip>
  );
}

import { ElementType, ReactNode, useCallback, useEffect, useState } from "react";
import { rpc } from "@/lib/rpc";
import { captureException } from "@sentry/nextjs";
import type { Placement } from "@floating-ui/react";
import type { TagBase } from "@/lib/tags/tagQueries";
import TagTooltip from "./TagTooltip";
import Tooltip from "./Tooltip";
import Loading from "./Loading";

export default function LazyTagTooltip({
  tagSlug,
  placement,
  As = "div",
  className,
  children,
}: Readonly<{
  tagSlug: string | null;
  placement?: Placement;
  As?: ElementType;
  className?: string;
  children: ReactNode;
}>) {
  const [tag, setTag] = useState<TagBase | null>(null);
  const [everHovered, setEverHovered] = useState(false);
  const onMouseEnter = useCallback(() => setEverHovered(true), []);

  // TODO: These results should be stored in a global cache to avoid refetching
  // the same tag multiple times
  const refetch = useCallback(async () => {
    if (!tagSlug) {
      setTag(null);
      return;
    }
    try {
      const result = await rpc.tags.listBySlug({ slug: tagSlug });
      setTag(result);
    } catch (e) {
      console.error(`Error fetching tag ${tagSlug}:`, e);
      captureException(e);
    }
  }, [tagSlug]);

  useEffect(() => {
    setEverHovered(false);
  }, [tagSlug]);

  useEffect(() => {
    if (everHovered) {
      void refetch();
    }
  }, [everHovered, refetch]);

  if (!tagSlug) {
    return <>{children}</>;
  }

  if (tag) {
    return (
      <TagTooltip As={As} placement={placement} className={className} tag={tag}>
        {children}
      </TagTooltip>
    );
  }

  return (
    <Tooltip
      As={As}
      placement={placement}
      className={className}
      popover
      tooltipClassName="px-3! py-2! w-[270px]"
      title={<Loading />}
    >
      <As onMouseEnter={onMouseEnter}>{children}</As>
    </Tooltip>
  );
}

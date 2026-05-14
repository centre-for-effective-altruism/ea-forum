import type { ElementType, ReactNode } from "react";
import type { Placement } from "@floating-ui/react";
import type { SequenceBase } from "@/lib/sequences/sequenceQueries";
import { sequencePostCount } from "@/lib/sequences/sequenceHelpers";
import UsersName from "./UsersName";
import Tooltip from "./Tooltip";
import Type from "./Type";

export default function SequenceTooltip({
  sequence,
  placement = "bottom-start",
  As = "div",
  className,
  children,
}: Readonly<{
  sequence: SequenceBase | null | undefined;
  placement?: Placement;
  As?: ElementType;
  className?: string;
  children: ReactNode;
}>) {
  if (!sequence) {
    return <>{children}</>;
  }
  const { title, user } = sequence;
  const postCount = sequencePostCount(sequence);
  return (
    <Tooltip
      placement={placement}
      As={As}
      className={className}
      tooltipClassName="
        bg-surface-floating! text-gray-900! p-0! shadow-md w-[360px] max-w-full
      "
      title={
        <div data-component="SequenceTooltip" className="px-4 py-3">
          <Type style="postTitle" className="font-[700] mb-1">
            {title}
          </Type>
          <Type style="bodySmall">
            <UsersName user={user} />
            {" · "}
            <span>
              {postCount} post{postCount === 1 ? "" : "s"}
            </span>
          </Type>
        </div>
      }
    >
      {children}
    </Tooltip>
  );
}

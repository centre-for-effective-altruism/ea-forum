import type { ElementType } from "react";
import { formatLongDateWithTime, formatRelativeTime } from "@/lib/timeUtils";
import Tooltip from "./Tooltip";
import Type, { TextStyle } from "./Type";

export default function TimeAgo({
  time,
  includeAgo,
  textStyle = "body",
  tooltipPrefix,
  As,
  className,
}: Readonly<{
  time: Date | string;
  includeAgo?: boolean;
  textStyle?: TextStyle;
  tooltipPrefix?: string;
  As?: ElementType;
  className?: string;
}>) {
  const date = new Date(time);
  return (
    <Tooltip
      title={
        <Type style="bodySmall">
          {tooltipPrefix}
          {formatLongDateWithTime(date)}
        </Type>
      }
      As={As}
      className={className}
    >
      <Type style={textStyle} As={As}>
        <time
          dateTime={date.toISOString()}
          suppressHydrationWarning
          className="cursor-inherit"
          data-component="TimeAgo"
        >
          {formatRelativeTime(date, { style: "short" })}
        </time>
        {includeAgo && <span className="hidden sm:inline"> ago</span>}
      </Type>
    </Tooltip>
  );
}

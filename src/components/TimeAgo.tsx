import type { ElementType } from "react";
import { formatLongDateWithTime, formatRelativeTime } from "@/lib/timeUtils";
import Tooltip from "./Tooltip";
import Type, { TextStyle } from "./Type";

export default function TimeAgo({
  time,
  includeAgo,
  textStyle = "body",
  As,
  className,
}: Readonly<{
  time: Date | string;
  includeAgo?: boolean;
  textStyle?: TextStyle;
  As?: ElementType;
  className?: string;
}>) {
  const date = new Date(time);
  return (
    <Tooltip
      title={<Type style="bodySmall">{formatLongDateWithTime(date)}</Type>}
      As={As}
      className={className}
    >
      <Type style={textStyle} As={As}>
        <time
          dateTime={date.toISOString()}
          className="cursor-default"
          data-component="TimeAgo"
        >
          {formatRelativeTime(date, { style: "short" })}
        </time>
        {includeAgo && <span className="hidden sm:inline"> ago</span>}
      </Type>
    </Tooltip>
  );
}

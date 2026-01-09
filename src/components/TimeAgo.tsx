import type { ElementType } from "react";
import { formatLongDate, formatRelativeTime } from "@/lib/timeUtils";
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
    <Tooltip title={formatLongDate(date)} As={As} className={className}>
      <Type style={textStyle} As={As}>
        <time dateTime={date.toISOString()} data-component="TimeAgo">
          {formatRelativeTime(date, { style: "short" })}
        </time>
        {includeAgo && " ago"}
      </Type>
    </Tooltip>
  );
}

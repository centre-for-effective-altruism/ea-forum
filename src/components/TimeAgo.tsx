import { formatLongDate, formatRelativeTime } from "@/lib/timeUtils";
import Tooltip from "./Tooltip";
import Type, { TextStyle } from "./Type";

export default function TimeAgo({
  time,
  textStyle = "body",
  className,
}: Readonly<{
  time: Date | string;
  textStyle?: TextStyle;
  className?: string;
}>) {
  const date = new Date(time);
  return (
    <Tooltip title={formatLongDate(date)} className={className}>
      <Type style={textStyle}>
        <time dateTime={date.toISOString()} data-component="TimeAgo">
          {formatRelativeTime(date, { style: "short" })}
        </time>
      </Type>
    </Tooltip>
  );
}

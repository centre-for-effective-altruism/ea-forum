import { formatLongDate, formatRelativeTime } from "@/lib/timeUtils";
import Tooltip from "./Tooltip";
import Type from "./Type";

export default function TimeAgo({
  time,
  className,
}: Readonly<{
  time: Date;
  className?: string;
}>) {
  return (
    <Tooltip title={formatLongDate(time)} className={className}>
      <Type style="body">
        <time dateTime={time.toISOString()} data-component="TimeAgo">
          {formatRelativeTime(time, { style: "short" })}
        </time>
      </Type>
    </Tooltip>
  );
}

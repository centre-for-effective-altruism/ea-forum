import clsx from "clsx";
import SoftArrowUpIcon from "./Icons/SoftArrowUpIcon";
import Tooltip from "./Tooltip";
import Type from "./Type";

export default function Score({
  baseScore,
  voteCount,
  orientation,
  className,
}: Readonly<{
  baseScore: number;
  voteCount: number;
  orientation: "vertical" | "horizontal";
  className?: string;
}>) {
  const orientClass = orientation === "vertical" ? "flex-col" : "flex-row-reverse";
  return (
    <div
      className={clsx(
        "flex items-center justify-center gap-1",
        orientClass,
        className,
      )}
      data-component="Score"
    >
      <SoftArrowUpIcon className="text-gray-400" />
      <Tooltip
        placement="left"
        title={
          <div className="text-center">
            <Type style="bodySmall">{baseScore} karma</Type>
            <Type style="bodySmall">
              ({voteCount} {voteCount === 1 ? "vote" : "votes"})
            </Type>
          </div>
        }
      >
        <Type style="bodySmall" className="text-gray-600">
          {baseScore}
        </Type>
      </Tooltip>
    </div>
  );
}

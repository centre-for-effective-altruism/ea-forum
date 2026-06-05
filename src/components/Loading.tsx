import type { CSSProperties, FC } from "react";
import clsx from "clsx";

const Dot: FC<{ colorClassName?: string; className?: string }> = ({
  colorClassName,
  className,
}) => (
  <span
    className={clsx(
      "inline-block h-[10px] w-[10px] rounded-full animate-bounce-delay",
      colorClassName ?? "bg-gray-600",
      className,
    )}
  />
);

export default function Loading({
  colorClassName,
  className,
  style,
}: {
  colorClassName?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      data-component="Loading"
      style={style}
      className={clsx(
        "flex items-center justify-center mx-auto h-[26px]",
        className,
      )}
    >
      <Dot
        colorClassName={colorClassName}
        className="[animation-delay:-0.32s] mr-[5px]"
      />
      <Dot
        colorClassName={colorClassName}
        className="[animation-delay:-0.16s] mr-[5px]"
      />
      <Dot colorClassName={colorClassName} />
    </div>
  );
}

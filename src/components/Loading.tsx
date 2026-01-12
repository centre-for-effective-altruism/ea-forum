import clsx from "clsx";
import { FC } from "react";

const Dot: FC<{ className?: string }> = ({ className }) => (
  <span
    className={clsx(
      "inline-block h-[10px] w-[10px] rounded-full animate-bounce-delay",
      "bg-gray-600",
      className,
    )}
  />
);

export default function Loading({ className }: { className?: string }) {
  return (
    <div
      className={clsx("mx-auto block h-[26px] max-w-[100px] text-center", className)}
    >
      <Dot className="[animation-delay:-0.32s] mr-[5px]" />
      <Dot className="[animation-delay:-0.16s] mr-[5px]" />
      <Dot />
    </div>
  );
}

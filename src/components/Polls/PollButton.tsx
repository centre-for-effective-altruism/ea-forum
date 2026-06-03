import type { FC } from "react";
import clsx from "clsx";

export default function PollButton({
  Icon,
  onClick,
  className,
}: {
  Icon: FC<{ className?: string }>
  onClick: () => void,
  className?: string,
}) {
  return (
    <button
      data-component="PollButton"
      className={clsx(
        "text-always-white rounded-full cursor-pointer",
        "w-[15px] h-[15px] flex items-center justify-center",
        "bg-[color-mix(in_oklab,_var(--color-always-black)_10%,_color-mix(in_oklab,_var(--forum-event-background)_65%,_var(--forum-event-foreground)_35%))]",
        "hover:bg-[color-mix(in_oklab,_var(--color-always-black)_50%,_color-mix(in_oklab,_var(--forum-event-background)_65%,_var(--forum-event-foreground)_35%))]",
        className,
      )}
      onClick={onClick}
    >
      <Icon className="w-[10px]" />
    </button>
  );
}

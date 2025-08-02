import { MouseEvent, ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTracking } from "@/lib/analyticsEvents";

const variants = {
  primaryFilled: "text-white bg-(--color-primary) hover:bg-(--color-primary-dark)",
  greyFilled: "text-black bg-gray-300 hover:bg-gray-400",
};

type ButtonVariant = keyof typeof variants;

export default function Button({
  variant = "primaryFilled",
  disabled,
  eventProps,
  href,
  onClick: onClick_,
  className = "",
  children,
}: Readonly<{
  variant?: ButtonVariant,
  disabled?: boolean,
  eventProps?: Record<string, string>,
  href?: string,
  onClick?: (ev: MouseEvent<HTMLButtonElement>) => void,
  className?: string,
  children: ReactNode,
}>) {
  const router = useRouter();
  const { captureEvent } = useTracking();
  const onClick = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    if (href) {
      captureEvent('linkClicked', {to: href, ...eventProps})
      onClick_?.(e);
      router.push(href);
    } else {
      captureEvent('buttonClicked', eventProps)
      onClick_?.(e);
    }
  }, [captureEvent, router, href, onClick_]);
  return (
    <button
      onClick={onClick}
      className={`
        min-w-[30px] text-[14px] font-[500] leading-[20px] px-3 py-2 rounded
        ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
        ${variants[variant]} ${className}
      `}
    >
      {children}
    </button>
  );
}

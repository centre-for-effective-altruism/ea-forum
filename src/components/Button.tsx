"use client";

import { MouseEvent, ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTracking } from "@/lib/analyticsEvents";
import clsx from "clsx";
import Loading from "./Loading";

const variants = {
  primaryFilled: "text-white bg-(--color-primary) hover:bg-(--color-primary-dark)",
  greyFilled: "text-black bg-gray-300 hover:bg-gray-400",
  greyOutlined: "border border-gray-400 hover:bg-(--color-outline-button-hover)",
};

type ButtonVariant = keyof typeof variants;

export default function Button({
  variant = "primaryFilled",
  type = "button",
  disabled,
  loading,
  eventProps,
  href,
  onClick: onClick_,
  testId,
  className = "",
  children,
}: Readonly<{
  variant?: ButtonVariant;
  type?: "submit" | "reset" | "button";
  disabled?: boolean;
  loading?: boolean;
  eventProps?: Record<string, string>;
  href?: string;
  onClick?: (ev: MouseEvent<HTMLButtonElement>) => void;
  testId?: string;
  className?: string;
  children: ReactNode;
}>) {
  const router = useRouter();
  const { captureEvent } = useTracking();
  const onClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      if (disabled) {
        return;
      }
      if (href) {
        captureEvent("linkClicked", { to: href, ...eventProps });
        onClick_?.(e);
        router.push(href);
      } else {
        captureEvent("buttonClicked", eventProps);
        onClick_?.(e);
      }
    },
    [captureEvent, router, disabled, href, onClick_, eventProps],
  );
  return (
    <button
      type={type}
      onClick={onClick}
      data-testid={testId}
      className={clsx(
        "min-w-[30px] text-[14px] font-[500] leading-[20px] px-3 py-2 rounded",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        loading && "relative",
        variants[variant],
        className,
      )}
    >
      <span className={clsx(loading ? "opacity-0" : "contents")}>{children}</span>
      {loading && (
        <Loading
          colorClassName={
            variant.indexOf("primary") >= 0 ? "bg-always-white" : undefined
          }
          className="absolute top-0 left-0 right-0 h-full!"
        />
      )}
    </button>
  );
}

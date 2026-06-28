import type { ReactNode } from "react";
import clsx from "clsx";
import { typeStyles } from "./Type";
import Link from "./Link";

/**
 * Shared styling for small textual link-buttons (e.g. "Customize feed",
 * "View more", "Load more", "Send feedback"). They all share the `loadMore`
 * type style and darken on hover — grey text -> gray-1000, primary text ->
 * primary-dark — so the hover treatment stays consistent across the app.
 */
export default function TextLinkButton({
  variant = "grey",
  href,
  onClick,
  disabled,
  className,
  children,
}: Readonly<{
  variant?: "grey" | "primary";
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}>) {
  const classes = clsx(
    typeStyles.loadMore,
    variant === "primary"
      ? "text-primary hover:text-primary-dark"
      : "text-gray-600 hover:text-gray-1000",
    className,
  );
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        classes,
        "cursor-pointer disabled:cursor-default disabled:opacity-50",
      )}
    >
      {children}
    </button>
  );
}

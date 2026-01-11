"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useMobileNav } from "@/lib/hooks/useMobileNav";
import { useBodyScrollLock } from "@/lib/hooks/useBodyScrollLock";
import clsx from "clsx";
import Nav from "./Nav";

export default function MobileNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { isMobileNavOpen, closeMobileNav } = useMobileNav();

  useBodyScrollLock(isMobileNavOpen);

  useEffect(() => {
    if (isMobileNavOpen) {
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          closeMobileNav();
        }
      };
      document.addEventListener("keydown", onKeyDown);
      return () => {
        document.removeEventListener("keydown", onKeyDown);
      };
    }
  }, [isMobileNavOpen, closeMobileNav]);

  useEffect(() => {
    closeMobileNav();
  }, [closeMobileNav, pathname, searchParams]);

  return (
    <div
      data-component="MobileNav"
      className={clsx(
        "fixed inset-0 z-(--zindex-mobile-nav) w-full h-screen mobile-nav:hidden",
        isMobileNavOpen ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      <div
        onClick={closeMobileNav}
        className={clsx(
          "absolute w-full h-full inset-0 bg-popover-dim",
          "transition-opacity duration-300",
          isMobileNavOpen ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          "absolute top-0 left-0 h-full w-[280px] max-w-full",
          "bg-gray-0 shadow-lg px-6 py-4",
          "transform transition-transform duration-300 ease-out",
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Nav />
      </div>
    </div>
  );
}

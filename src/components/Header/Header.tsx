"use client";

import { Suspense, useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import { getSiteLogoUrl } from "@/lib/cloudinary/cloudinaryHelpers";
import { useMobileNav } from "@/lib/hooks/useMobileNav";
import clsx from "clsx";
import Image from "next/image";
import Bars3Icon from "@heroicons/react/24/solid/Bars3Icon";
import MagnifyingGlassIcon from "@heroicons/react/24/outline/MagnifyingGlassIcon";
import HeaderButton from "./HeaderButton";
import HeaderSearch from "./HeaderSearch";
import HeaderUserButtons, { HeaderUserSkeleton } from "./HeaderUserButtons";
import Type from "@/components/Type";
import Link from "@/components/Link";
import Headroom from "./Headroom";

const HEADER_HEIGHT = 66;
const HEADER_HEIGHT_CLASS = "h-[66px]";

function MobileNavButton({ hideOnDesktop }: Readonly<{ hideOnDesktop: boolean }>) {
  const { openMobileNav } = useMobileNav();
  return (
    <button
      aria-label="Toggle navigation menu"
      onClick={openMobileNav}
      className={clsx(
        "cursor-pointer hover:bg-item-hover p-1.5 rounded",
        hideOnDesktop && "mobile-nav:hidden",
      )}
    >
      <Bars3Icon className="w-6" />
    </button>
  );
}

// The home page shows the nav in a sidebar on desktop
function PathnameMobileNavButton() {
  const pathname = usePathname();
  return <MobileNavButton hideOnDesktop={pathname === "/"} />;
}

export default function Header({
  stayAtTop,
}: Readonly<{
  stayAtTop?: boolean;
}>) {
  const [_isUnfixed, setIsUnfixed] = useState(true);
  const setUnfixed = useCallback(() => setIsUnfixed(true), []);
  const setFixed = useCallback(() => setIsUnfixed(false), []);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const toggleSearch = useCallback(() => setIsSearchOpen((open) => !open), []);

  return (
    <div className="w-full" data-component="Header">
      <Headroom
        disableInlineStyles
        downTolerance={10}
        upTolerance={10}
        height={HEADER_HEIGHT}
        onUnfix={setUnfixed}
        onUnpin={setFixed}
        disable={stayAtTop}
        className="headroom-root"
      >
        <header
          className={clsx(
            "static bg-gray-50 shadow-xs text-gray-1000 w-full",
            HEADER_HEIGHT_CLASS,
          )}
        >
          <nav className="w-full mx-auto h-full px-2 sm:px-5 flex items-center">
            <Suspense fallback={<MobileNavButton hideOnDesktop={false} />}>
              <PathnameMobileNavButton />
            </Suspense>
            <Type style="logo" className="grow flex items-center">
              <Link href="/" className="inline-flex items-center gap-1">
                <Image
                  src={getSiteLogoUrl(100)}
                  alt="Effective Altruism Forum"
                  width={34}
                  height={34}
                  loading="eager"
                />
                <span className="translate-y-px">
                  <span className="hidden md:inline">Effective Altruism Forum</span>
                  <span className="max-[330px]:hidden md:hidden inline">
                    EA Forum
                  </span>
                </span>
              </Link>
            </Type>
            <div className="flex gap-2 items-center">
              {isSearchOpen ? (
                <HeaderSearch onClose={toggleSearch} />
              ) : (
                <HeaderButton
                  Icon={MagnifyingGlassIcon}
                  description="Search"
                  onClick={toggleSearch}
                />
              )}
              <Suspense fallback={<HeaderUserSkeleton />}>
                <HeaderUserButtons />
              </Suspense>
            </div>
          </nav>
        </header>
      </Headroom>
    </div>
  );
}

"use client";

import { useCallback, useState } from "react";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import { getSiteLogoUrl } from "@/lib/cloudinary/cloudinaryHelpers";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useMobileNav } from "@/lib/hooks/useMobileNav";
import clsx from "clsx";
import Image from "next/image";
import Bars3Icon from "@heroicons/react/24/solid/Bars3Icon";
import MagnifyingGlassIcon from "@heroicons/react/24/outline/MagnifyingGlassIcon";
import EnvelopeIcon from "@heroicons/react/24/outline/EnvelopeIcon";
import ChevronDownIcon from "@heroicons/react/16/solid/ChevronDownIcon";
import NotificationsHeaderButton from "../Notifications/NotificationsHeaderButton";
import UserDropdownMenu from "../Dropdown/UserDropdownMenu";
import LoginPopover from "@/components/Auth/LoginPopover";
import UserProfileImage from "../UserProfileImage";
import HeaderButton from "./HeaderButton";
import HeaderSearch from "./HeaderSearch";
import Button from "@/components/Button";
import Type from "@/components/Type";
import Link from "@/components/Link";
import Headroom from "./Headroom";

const HEADER_HEIGHT = 66;
const HEADER_HEIGHT_CLASS = "h-[66px]";

export default function Header({
  stayAtTop,
}: Readonly<{
  stayAtTop?: boolean;
}>) {
  const [_isUnfixed, setIsUnfixed] = useState(true);
  const setUnfixed = useCallback(() => setIsUnfixed(true), []);
  const setFixed = useCallback(() => setIsUnfixed(false), []);
  const { onLogin, onSignup } = useLoginPopoverContext();
  const { openMobileNav, showMobileNavOnDesktop } = useMobileNav();
  const { currentUser } = useCurrentUser();
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
            <button
              aria-label="Toggle navigation menu"
              onClick={openMobileNav}
              className={clsx(
                "cursor-pointer hover:bg-item-hover p-1.5 rounded",
                !showMobileNavOnDesktop && "mobile-nav:hidden",
              )}
            >
              <Bars3Icon className="w-6" />
            </button>
            <Type style="logo" className="grow flex items-center">
              <Link href="/" className="inline-flex items-center gap-1">
                <Image
                  src={getSiteLogoUrl(100)}
                  alt="Effective Altruism Forum"
                  width={34}
                  height={34}
                />
                <span className="translate-y-px">
                  <span className="hidden md:inline">Effective Altruism Forum</span>
                  <span className="max-[400px]:hidden md:hidden inline">
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
              {currentUser ? (
                <>
                  <NotificationsHeaderButton />
                  <Link href="/inbox" className="hover:opacity-100!">
                    <HeaderButton Icon={EnvelopeIcon} description="Messages" />
                  </Link>
                  <UserDropdownMenu>
                    <button
                      className="
                        cursor-pointer hover:bg-item-hover rounded h-9 px-1.5
                        flex items-center gap-1
                      "
                    >
                      <UserProfileImage user={currentUser} size={32} />
                      <ChevronDownIcon className="w-[16px] text-gray-600" />
                    </button>
                  </UserDropdownMenu>
                </>
              ) : (
                <>
                  <Button variant="greyFilled" onClick={onLogin}>
                    Login
                  </Button>
                  <Button
                    variant="primaryFilled"
                    onClick={onSignup}
                    className="max-sm:hidden"
                  >
                    Sign up
                  </Button>
                  <LoginPopover />
                </>
              )}
            </div>
          </nav>
        </header>
      </Headroom>
    </div>
  );
}

"use client";

import { useCallback, useState } from "react";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useMobileNav } from "@/lib/hooks/useMobileNav";
import Bars3Icon from "@heroicons/react/24/solid/Bars3Icon";
import MagnifyingGlassIcon from "@heroicons/react/24/outline/MagnifyingGlassIcon";
import BellIcon from "@heroicons/react/24/outline/BellIcon";
import EnvelopeIcon from "@heroicons/react/24/outline/EnvelopeIcon";
import ChevronDownIcon from "@heroicons/react/16/solid/ChevronDownIcon";
import Image from "next/image";
import LoginPopover from "@/components/Auth/LoginPopover";
import Column from "@/components/Column";
import Type from "@/components/Type";
import Link from "@/components/Link";
import Button from "@/components/Button";
import Headroom from "./Headroom";
import HeaderButton from "./HeaderButton";
import UserProfileImage from "../UserProfileImage";
import UserDropdownMenu from "../Dropdown/UserDropdownMenu";
import NotificationsDropdown from "../Notifications/NotificationsDropdown";
import HeaderSearch from "./HeaderSearch";

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
  const { openMobileNav } = useMobileNav();
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
        <header className={`${HEADER_HEIGHT_CLASS} static bg-gray-50 shadow-xs`}>
          <Column As="nav" className="h-full px-1 sm:px-5 flex items-center">
            <button
              aria-label="Toggle navigation menu"
              onClick={openMobileNav}
              className="
                mobile-nav:hidden hover:bg-gray-200 p-2 rounded-full
                cursor-pointer
              "
            >
              <Bars3Icon className="w-6" />
            </button>
            <Type style="logo" className="grow flex items-center">
              <Link href="/" className="inline-flex items-center gap-1">
                <Image
                  src="/ea-logo-square.png"
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
                  <NotificationsDropdown>
                    <HeaderButton Icon={BellIcon} description="Notifications" />
                  </NotificationsDropdown>
                  <HeaderButton Icon={EnvelopeIcon} description="Messages" />
                  <UserDropdownMenu>
                    <button
                      className={`
                        cursor-pointer hover:bg-gray-200 rounded p-2
                        flex item-center gap-1
                      `}
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
                  <Button variant="primaryFilled" onClick={onSignup}>
                    Sign up
                  </Button>
                  <LoginPopover />
                </>
              )}
            </div>
          </Column>
        </header>
      </Headroom>
    </div>
  );
}

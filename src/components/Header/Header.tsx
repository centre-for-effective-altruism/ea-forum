"use client";

import { useCallback, useState } from "react";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import MagnifyingGlassIcon from "@heroicons/react/24/outline/MagnifyingGlassIcon";
import BellIcon from "@heroicons/react/24/outline/BellIcon";
import EnvelopeIcon from "@heroicons/react/24/outline/EnvelopeIcon";
import Image from "next/image";
import LoginPopover from "@/components/Auth/LoginPopover";
import Column from "@/components/Column";
import Type from "@/components/Type";
import Link from "@/components/Link";
import Button from "@/components/Button";
import Headroom from "./Headroom";
import HeaderButton from "./HeaderButton";

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
  const { currentUser } = useCurrentUser();

  return (
    <div className="w-screen" data-component="Header">
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
          <Column As="nav" className="h-full px-5 flex items-center">
            <Type style="logo" className="grow flex items-center">
              <Link href="/" className="inline-flex items-center gap-1">
                <Image
                  src="/ea-logo-square.png"
                  alt="Effective Altruism Forum"
                  width={34}
                  height={34}
                />
                <span className="translate-y-px">Effective Altruism Forum</span>
              </Link>
            </Type>
            <div className="flex gap-2 items-center">
              <HeaderButton Icon={MagnifyingGlassIcon} description="Search" />
              {currentUser ? (
                <>
                  <HeaderButton Icon={BellIcon} description="Notifications" />
                  <HeaderButton Icon={EnvelopeIcon} description="Messages" />
                  <Type>{currentUser.displayName}</Type>
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

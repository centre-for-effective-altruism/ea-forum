"use client";

import { useCallback, useState } from "react";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import Image from "next/image";
import LoginPopover from "@/components/Auth/LoginPopover";
import Column from "@/components/Column";
import Type from "@/components/Type";
import Link from "@/components/Link";
import Button from "@/components/Button";
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
            <Type style="logo" className="grow">
              <Link href="/" className="flex items-center gap-1">
                <Image
                  src="/ea-logo-square.png"
                  alt="Effective Altruism Forum"
                  width={34}
                  height={34}
                />
                Effective Altruism Forum
              </Link>
            </Type>
            <div className="flex gap-2">
              {currentUser ? (
                <>{currentUser.displayName}</>
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

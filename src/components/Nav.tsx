"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Headroom from "./Headroom";
import Type from "./Type";
import Link from "./Link";

const NAV_HEIGHT = 66;
const NAV_HEIGHT_CLASS = "h-[66px]";

export default function Nav({stayAtTop}: Readonly<{
  stayAtTop?: boolean,
}>) {
  const [_isUnfixed, setIsUnfixed] = useState(true);
  const setUnfixed = useCallback(() => setIsUnfixed(true), []);
  const setFixed = useCallback(() => setIsUnfixed(false), []);

  return (
    <div className="w-screen" data-component="Nav">
      <Headroom
        disableInlineStyles
        downTolerance={10}
        upTolerance={10}
        height={NAV_HEIGHT}
        onUnfix={setUnfixed}
        onUnpin={setFixed}
        disable={stayAtTop}
        className="headroom-root"
      >
        <header className={`${NAV_HEIGHT_CLASS} static bg-gray-50 shadow-xs`}>
          <nav className="max-w-6xl h-full mx-auto my-0 flex items-center px-5">
            <Type className="grow">
              <Link href="/" className="inline-flex items-center gap-1">
                <Image
                  src="/ea-logo-square.png"
                  alt="Effective Altruism Forum"
                  width={34}
                  height={34}
                />
                Effective Altruism Forum
              </Link>
            </Type>
            <div>
              Buttons
            </div>
          </nav>
        </header>
      </Headroom>
    </div>
  );
}

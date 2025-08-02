"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Headroom from "./Headroom";
import Column from "./Column";
import Type from "./Type";
import Link from "./Link";

const HEADER_HEIGHT = 66;
const HEADER_HEIGHT_CLASS = "h-[66px]";

export default function Header({stayAtTop}: Readonly<{
  stayAtTop?: boolean,
}>) {
  const [_isUnfixed, setIsUnfixed] = useState(true);
  const setUnfixed = useCallback(() => setIsUnfixed(true), []);
  const setFixed = useCallback(() => setIsUnfixed(false), []);

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
          </Column>
        </header>
      </Headroom>
    </div>
  );
}

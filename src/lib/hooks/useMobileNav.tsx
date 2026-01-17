"use client";

import { usePathname } from "next/navigation";
import { createContext, ReactNode, useCallback, useContext, useState } from "react";

type MobileNavContext = {
  isMobileNavOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  showMobileNavOnDesktop: boolean;
};

const mobileNavContext = createContext<MobileNavContext | null>(null);

export const MobileNavProvider = ({
  children,
}: Readonly<{
  children: ReactNode;
}>) => {
  const pathname = usePathname();
  const showMobileNavOnDesktop = pathname !== "/";
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const openMobileNav = useCallback(() => setIsMobileNavOpen(true), []);
  const closeMobileNav = useCallback(() => setIsMobileNavOpen(false), []);
  return (
    <mobileNavContext.Provider
      value={{
        isMobileNavOpen,
        openMobileNav,
        closeMobileNav,
        showMobileNavOnDesktop,
      }}
    >
      {children}
    </mobileNavContext.Provider>
  );
};

export const useMobileNav = (): MobileNavContext => {
  const value = useContext(mobileNavContext);
  if (!value) {
    throw new Error("Mobile nav context not found");
  }
  return value;
};

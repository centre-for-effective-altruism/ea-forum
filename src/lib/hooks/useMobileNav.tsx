"use client";

import { createContext, ReactNode, useCallback, useContext, useState } from "react";

type MobileNavContext = {
  isMobileNavOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;
};

const mobileNavContext = createContext<MobileNavContext | null>(null);

export const MobileNavProvider = ({
  children,
}: Readonly<{
  children: ReactNode;
}>) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const openMobileNav = useCallback(() => setIsMobileNavOpen(true), []);
  const closeMobileNav = useCallback(() => setIsMobileNavOpen(false), []);
  return (
    <mobileNavContext.Provider
      value={{ isMobileNavOpen, openMobileNav, closeMobileNav }}
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

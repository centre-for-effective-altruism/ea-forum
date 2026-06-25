"use client";

import { createContext, FC, ReactNode, useContext, useMemo } from "react";
import { CLIENT_ID_COOKIE } from "../clientIds/clientIdHelpers";
import { useCookiesWithConsent } from "../cookies/useCookiesWithConsent";
import { randomId } from "../utils/random";

const clientIdContext = createContext<string | null>(null);

export const ClientIdProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [cookies] = useCookiesWithConsent([CLIENT_ID_COOKIE]);
  const clientId = useMemo(() => {
    return cookies.clientId ?? randomId();
  }, [cookies.clientId]);
  return (
    <clientIdContext.Provider value={clientId}>{children}</clientIdContext.Provider>
  );
};

export const useClientId = (): { clientId: string } => {
  const clientId = useContext(clientIdContext);
  if (!clientId) {
    throw new Error("Client ID provider not found");
  }
  return { clientId };
};

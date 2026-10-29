"use client";

import { createContext, FC, ReactNode, useContext, useMemo } from "react";
import { CLIENT_ID_COOKIE } from "../clientIds/clientIdHelpers";
import { useCookiesWithConsent } from "../cookies/useCookiesWithConsent";
import { randomId } from "../utils/random";
import { isAnyTest, isServer } from "../environment";

const clientIdContext = createContext<string | null>(null);

export const ClientIdProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [cookies] = useCookiesWithConsent([CLIENT_ID_COOKIE]);
  // The client ID is only used on the client, where it's always set by the
  // client ID script, so we don't need a real value in the static shell
  const clientId = useMemo(() => {
    return cookies.clientId ?? (isServer ? "" : randomId());
  }, [cookies.clientId]);
  return (
    <clientIdContext.Provider value={clientId}>{children}</clientIdContext.Provider>
  );
};

export const useClientId = (): { clientId: string } => {
  const clientId = useContext(clientIdContext);
  if (clientId === null) {
    if (isAnyTest()) {
      return { clientId: "test-client-id" };
    }
    throw new Error("Client ID provider not found");
  }
  return { clientId };
};

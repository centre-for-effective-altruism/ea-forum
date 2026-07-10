"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as Sentry from "@sentry/browser";
import posthog from "posthog-js";
import { rpc } from "../rpc";
import { useClientId } from "./useClientId";
import type { CurrentUser } from "../users/currentUser";

type CurrentUserContext = {
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser | null) => void;
  refetchCurrentUser: () => Promise<CurrentUser | null>;
};

const currentUserContext = createContext<CurrentUserContext>({
  currentUser: null,
  setCurrentUser: () => {},
  refetchCurrentUser: () => Promise.resolve(null),
});

export function CurrentUserProvider({
  user,
  children,
}: Readonly<{ user: CurrentUser | null; children: ReactNode }>) {
  const { clientId } = useClientId();
  const [currentUser, setCurrentUser] = useState(user);

  const refetchCurrentUser = useCallback(async (): Promise<CurrentUser | null> => {
    const data = await rpc.users.currentUser();
    setCurrentUser(data);
    return data;
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      setCurrentUser,
      refetchCurrentUser,
    }),
    [currentUser, setCurrentUser, refetchCurrentUser],
  );

  useEffect(() => {
    if (window.dataLayer) {
      window.dataLayer.push({ userId: currentUser?._id ?? null });
    } else {
      console.warn("Trying to call gtag before dataLayer has been initialized");
    }
    Sentry.setUser(
      currentUser
        ? {
            id: currentUser._id,
            email: currentUser.email ?? undefined,
            username: currentUser.username ?? currentUser.displayName ?? undefined,
          }
        : null,
    );
    posthog.reset();
    if (currentUser) {
      posthog.identify(currentUser._id, {
        email: currentUser.email ?? undefined,
        username: currentUser.username ?? currentUser.displayName ?? undefined,
        clientId,
      });
    } else {
      posthog.identify(`logged-out-${clientId}`, { clientId });
    }
  }, [currentUser, clientId]);

  return (
    <currentUserContext.Provider value={value}>
      {children}
    </currentUserContext.Provider>
  );
}

export const useCurrentUser = () => useContext(currentUserContext);

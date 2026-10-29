"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  use,
} from "react";
import * as Sentry from "@sentry/browser";
import posthog from "posthog-js";
import { rpc } from "../rpc";
import { useClientId } from "./useClientId";
import { posthogSuperProperties } from "../analytics/posthogSuperProperties";
import type { CurrentUser } from "../users/currentUser";

type CurrentUserContext = {
  userPromise: Promise<CurrentUser | null>;
  // `undefined` until `userPromise` has resolved on the client
  loadedUser: CurrentUser | null | undefined;
  setCurrentUser: (user: CurrentUser | null) => void;
  refetchCurrentUser: () => Promise<CurrentUser | null>;
};

const currentUserContext = createContext<CurrentUserContext>({
  userPromise: Promise.resolve(null),
  loadedUser: null,
  setCurrentUser: () => {},
  refetchCurrentUser: () => Promise.resolve(null),
});

/**
 * The current user is passed in as a promise so that the static shell can be
 * prerendered without it. Components that read the current user with
 * `useCurrentUser` suspend until it resolves, so they must be rendered inside
 * a `Suspense` boundary.
 */
export function CurrentUserProvider({
  userPromise,
  children,
}: Readonly<{ userPromise: Promise<CurrentUser | null>; children: ReactNode }>) {
  const { clientId } = useClientId();
  const [loadedUser, setLoadedUser] = useState<CurrentUser | null | undefined>();

  useEffect(() => {
    let cancelled = false;
    void userPromise.then((user) => {
      if (!cancelled) {
        setLoadedUser((current) => (current === undefined ? user : current));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userPromise]);

  const refetchCurrentUser = useCallback(async (): Promise<CurrentUser | null> => {
    const data = await rpc.users.currentUser();
    setLoadedUser(data);
    return data;
  }, []);

  const value = useMemo(
    () => ({
      userPromise,
      loadedUser,
      setCurrentUser: setLoadedUser,
      refetchCurrentUser,
    }),
    [userPromise, loadedUser, refetchCurrentUser],
  );

  useEffect(() => {
    if (loadedUser === undefined) {
      return;
    }
    const currentUser = loadedUser;
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
    if (posthog.get_distinct_id() === clientId) {
      // Logged-out users used to be identified by their client ID, which stops
      // their anonymous activity being merged into their account when they log in
      const consentStatus = posthog.get_explicit_consent_status();
      posthog.reset();
      if (consentStatus === "granted") {
        posthog.opt_in_capturing({ captureEventName: false });
      }
    }
    posthog.register({ ...posthogSuperProperties, clientId });
    if (currentUser) {
      posthog.identify(currentUser._id, {
        email: currentUser.email ?? undefined,
        username: currentUser.username ?? currentUser.displayName ?? undefined,
        clientId,
      });
    }
  }, [loadedUser, clientId]);

  return (
    <currentUserContext.Provider value={value}>
      {children}
    </currentUserContext.Provider>
  );
}

/**
 * Suspends until the current user has loaded.
 */
export const useCurrentUser = () => {
  const { userPromise, loadedUser, setCurrentUser, refetchCurrentUser } =
    useContext(currentUserContext);
  const resolvedUser = use(userPromise);
  const currentUser = loadedUser === undefined ? resolvedUser : loadedUser;
  return { currentUser, setCurrentUser, refetchCurrentUser };
};

/**
 * Doesn't suspend. Returns `undefined` until the current user has loaded on the
 * client. This is for providers and effects that wrap the whole page, which
 * can't suspend without removing the page from the static shell.
 */
export const useCurrentUserIfLoaded = () =>
  useContext(currentUserContext).loadedUser;

/**
 * Doesn't suspend. Returns a function that resolves to the current user once it
 * has loaded, for use in event handlers.
 */
export const useCurrentUserGetter = () => {
  const { userPromise, loadedUser } = useContext(currentUserContext);
  return useCallback(
    async () => (loadedUser === undefined ? await userPromise : loadedUser),
    [userPromise, loadedUser],
  );
};

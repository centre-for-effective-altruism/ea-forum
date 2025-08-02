"use client";

import { createContext, ReactNode, useContext, useMemo } from "react";

type CurrentUser = {
  _id: string;
};

type CurrentUserContext = {
  currentUser: CurrentUser | null;
  refetchCurrentUser: () => Promise<CurrentUser | null>;
};

const currentUserContext = createContext<CurrentUserContext>({
  currentUser: null,
  refetchCurrentUser: () => Promise.resolve(null),
});

export function CurrentUserProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const value = useMemo(
    () => ({
      currentUser: null,
      refetchCurrentUser: () => Promise.resolve(null),
    }),
    [],
  );
  return (
    <currentUserContext.Provider value={value}>
      {children}
    </currentUserContext.Provider>
  );
}

export const useCurrentUser = () => useContext(currentUserContext);

"use client";

import { createContext, ReactNode, useContext, useMemo } from "react";
import type { ICurrentUser } from "../users/userQueries.schemas";

type CurrentUserContext = {
  currentUser: ICurrentUser | null;
  refetchCurrentUser: () => Promise<ICurrentUser | null>;
};

const currentUserContext = createContext<CurrentUserContext>({
  currentUser: null,
  refetchCurrentUser: () => Promise.resolve(null),
});

export function CurrentUserProvider({
  currentUser,
  children,
}: Readonly<{ currentUser: ICurrentUser | null; children: ReactNode }>) {
  const value = useMemo(
    () => ({
      currentUser,
      // TODO: Implement refetching current user
      refetchCurrentUser: () => Promise.resolve(null),
    }),
    [currentUser],
  );
  return (
    <currentUserContext.Provider value={value}>
      {children}
    </currentUserContext.Provider>
  );
}

export const useCurrentUser = () => useContext(currentUserContext);

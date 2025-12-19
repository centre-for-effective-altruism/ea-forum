"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { CurrentUser } from "../users/currentUser";
import { fetchCurrentUserAction } from "../actions/userActions";

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
  const [currentUser, setCurrentUser] = useState(user);

  const refetchCurrentUser = useCallback(async () => {
    const user = await fetchCurrentUserAction();
    setCurrentUser(user);
    return user;
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      setCurrentUser,
      refetchCurrentUser,
    }),
    [currentUser, setCurrentUser, refetchCurrentUser],
  );

  return (
    <currentUserContext.Provider value={value}>
      {children}
    </currentUserContext.Provider>
  );
}

export const useCurrentUser = () => useContext(currentUserContext);

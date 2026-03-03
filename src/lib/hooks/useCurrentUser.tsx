"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { rpc } from "../rpc";
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

  return (
    <currentUserContext.Provider value={value}>
      {children}
    </currentUserContext.Provider>
  );
}

export const useCurrentUser = () => useContext(currentUserContext);

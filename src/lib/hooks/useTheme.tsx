"use client";

import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import { useCurrentUser } from "./useCurrentUser";
import { rpc } from "../rpc";
import { useCookiesWithConsent } from "../cookies/useCookiesWithConsent";
import { validateThemeWithDefault, Theme } from "../themes";

type ThemeContext = {
  theme: Theme;
  updateTheme: (theme: Theme) => Promise<void>;
};

const themeContext = createContext<ThemeContext | null>(null);

export const ThemeProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [cookies, setCookie] = useCookiesWithConsent(["theme"]);
  const { currentUser } = useCurrentUser();
  const [theme, setTheme] = useState<Theme>(
    currentUser?.theme?.name ?? validateThemeWithDefault(cookies.theme),
  );
  const updateTheme = useCallback(
    async (theme: Theme) => {
      setTheme(theme);
      setCookie("theme", theme, { maxAge: 315360000 });
      if (currentUser) {
        await rpc.users.updateTheme({ theme });
      }
    },
    [currentUser, setCookie],
  );
  return (
    <themeContext.Provider value={{ theme, updateTheme }}>
      {children}
    </themeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(themeContext);
  if (!ctx) {
    throw new Error("Theme context not found");
  }
  return ctx;
};

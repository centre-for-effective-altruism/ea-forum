"use client";

import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useCurrentUserIfLoaded } from "./useCurrentUser";
import { rpc } from "../rpc";
import { useCookiesWithConsent } from "../cookies/useCookiesWithConsent";
import { validateThemeWithDefault, themeClasses, Theme } from "../themes";

type ThemeContext = {
  theme: Theme;
  updateTheme: (theme: Theme) => Promise<void>;
};

const themeContext = createContext<ThemeContext | null>(null);

export const ThemeProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [cookies, setCookie] = useCookiesWithConsent(["theme"]);
  const currentUser = useCurrentUserIfLoaded();
  const [theme, setTheme] = useState<Theme>(() =>
    validateThemeWithDefault(cookies.theme),
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

  // The user's saved theme takes precedence over the cookie. Copy it into the
  // cookie so that the theme script can apply it on future page loads.
  const userTheme = currentUser?.theme?.name;
  useEffect(() => {
    if (userTheme) {
      const validTheme = validateThemeWithDefault(userTheme);
      setTheme(validTheme);
      setCookie("theme", validTheme, { maxAge: 315360000 });
    }
  }, [userTheme, setCookie]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(...Object.values(themeClasses));
    root.classList.add(themeClasses[theme]);
  }, [theme]);

  return (
    <themeContext.Provider value={{ theme, updateTheme }}>
      <div data-component="ThemeProvider">{children}</div>
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

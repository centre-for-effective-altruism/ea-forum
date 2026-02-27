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
import { useCurrentUser } from "./useCurrentUser";
import { rpc } from "../rpc";
import { useCookiesWithConsent } from "../cookies/useCookiesWithConsent";
import { validateThemeWithDefault, Theme } from "../themes";

type ThemeContext = {
  theme: Theme;
  updateTheme: (theme: Theme) => Promise<void>;
};

const themeContext = createContext<ThemeContext | null>(null);

const themeClasses: Record<Theme, string> = {
  auto: "theme-auto",
  default: "theme-light",
  dark: "theme-dark",
};

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

  useEffect(() => {
    // We want to apply the theme classes to body, but we can't do that during
    // SSR without delaying TTFP. To avoid this, we apply the classes first on
    // the div below during SSR (which includes all the main page content, but
    // not the page background or absolutely positioned elemnts attached to the
    // body), and then add the class to the body after rendering in this useEffect.
    // This is sufficient to prevent a flash of unstyled content.
    const body = document.body;
    if (body) {
      body.classList.remove(...Object.values(themeClasses));
      body.classList.add(themeClasses[theme]);
    }
  }, [theme]);

  return (
    <themeContext.Provider value={{ theme, updateTheme }}>
      <div data-component="ThemeProvider" className={themeClasses[theme]}>
        {children}
      </div>
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

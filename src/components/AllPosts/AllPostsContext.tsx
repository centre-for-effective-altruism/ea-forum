"use client";

import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCookiesWithConsent } from "@/lib/cookies/useCookiesWithConsent";
import { useTracking } from "@/lib/analyticsEvents";
import { cookieName } from "@/lib/cookies/cookies";
import {
  AllPostsLimits,
  allPostsLimitsFromQuery,
  AllPostsSettings,
  allPostsSettingsFromQuery,
  booleanSchema,
} from "@/lib/posts/allPostsSettings";

type AllPostsContext = {
  showOptions: boolean;
  toggleShowOptions: () => void;
  settings: AllPostsSettings;
  limits: AllPostsLimits;
  onUpdateSetting: (setting: string, value: string) => void;
};

const allPostsContext = createContext<AllPostsContext | null>(null);

const settingsCookie = cookieName("all_posts_settings_open");

export const AllPostsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [cookies, setCookie] = useCookiesWithConsent([settingsCookie]);
  const { captureEvent } = useTracking();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showOptions, setShowOptions] = useState(
    booleanSchema.catch(true).parse(cookies[settingsCookie]),
  );

  const [settings, limits] = useMemo(() => {
    const rawSearchParams = Object.fromEntries(searchParams.entries());
    const settings = allPostsSettingsFromQuery(rawSearchParams);
    const limits = allPostsLimitsFromQuery(rawSearchParams);
    return [settings, limits];
  }, [searchParams]);

  const toggleShowOptions = useCallback(async () => {
    const newValue = !showOptions;
    setShowOptions(newValue);
    setCookie(settingsCookie, String(newValue));
    captureEvent("toggleSettings", {
      action: newValue,
    });
  }, [showOptions, setCookie, captureEvent]);

  const onUpdateSetting = useCallback(
    (setting: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(setting, value);
      router.push(`${pathname}?${params.toString()}`);
      captureEvent("allPostsSettingsUpdate", {
        param: setting,
        value,
      });
    },
    [captureEvent, searchParams, router, pathname],
  );

  return (
    <allPostsContext.Provider
      value={{
        showOptions,
        toggleShowOptions,
        settings,
        limits,
        onUpdateSetting,
      }}
    >
      {children}
    </allPostsContext.Provider>
  );
};

export const useAllPosts = (): AllPostsContext => {
  const value = useContext(allPostsContext);
  if (!value) {
    throw new Error("All posts context not found");
  }
  return value;
};

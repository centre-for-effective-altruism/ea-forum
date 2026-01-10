import Cookies from "universal-cookie";
import keyBy from "lodash/keyBy";
import { TupleSet, UnionOf } from "../typeHelpers";
import { getExplicitConsentRequiredAsync } from "./consentRequired";

type CookieSignature = {
  name: string;
  type: CookieType;
  /** User readable description of what the cookie does (shown in cookie policy) */
  description: string;
  thirdPartyName?: string;
  /**
   * String description of the longest possible expiry date.
   * Can be e.g. "12 months" or "Session"
   */
  maxExpires: string;
  /**
   * Not all cookies have uniquely determinable names (e.g. if they include a
   * session id in the cookie name). In this case, you can provide a function
   * that returns true if the cookie name matches a pattern (e.g. if it starts
   * with 'intercom-id')
   */
  matches: (name: string) => boolean;
};

type CookieDefinition = Pick<CookieSignature, "name" | "type" | "description"> &
  Partial<Omit<CookieSignature, "name" | "type" | "description">>;

export const HIDE_COLLECTION_ITEM_PREFIX = "hide_collection_item_";
export const HIDE_SPOTLIGHT_ITEM_PREFIX = "hide_spotlight_item_";
export const HIDE_FORUM_EVENT_BANNER_PREFIX = "hide_forum_event_banner_";

const allCookies = [
  // Cookie config cookies
  {
    name: "cookie_preferences", // Must match variable in Google Tag Manager
    type: "necessary",
    description:
      "Stores the current cookie preferences (set by the user, or automatically if outside a country subject to GDPR)",
  },
  {
    name: "cookie_consent_timestamp",
    type: "necessary",
    description:
      "Stores the time at which the user set their cookie preferences (once this is set the cookie preferences will never be changed automatically)",
  },

  // First party cookies
  {
    name: "clientId",
    type: "necessary",
    description: "A unique identifier for this browser",
  },
  {
    name: "loginToken",
    type: "necessary",
    description: "The user's login token",
  },
  {
    name: "timezone",
    type: "necessary",
    description: "Stores the user's timezone",
  },
  {
    name: "theme",
    type: "necessary",
    description: "Stores the user's theme preferences",
  },
  {
    name: "show_community_posts_section",
    type: "necessary",
    description:
      "Whether to show the community posts section on the EA Forum home page",
  },
  {
    name: "show_quick_takes_section",
    type: "necessary",
    description: "Whether to show the quick takes section on the EA Forum home page",
  },
  {
    name: "show_quick_takes_community",
    type: "necessary",
    description:
      "Whether to include quick takes tagged with community in the home page quick takes section",
  },
  {
    name: "show_popular_comments_section",
    type: "necessary",
    description:
      "Whether to show the popular comments section on the EA Forum home page",
  },
  {
    name: "hide_home_handbook",
    type: "necessary",
    description: "Whether to hide the EA Handbook on the EA Forum home page",
  },
  {
    name: "show_post_podcast_player",
    type: "necessary",
    description: "Whether to show the podcast player on a posts pages",
  },
  {
    name: "hide_welcome_box",
    type: "necessary",
    description: "Controls whether the welcome box on a post page is hidden",
  },
  {
    name: `${HIDE_COLLECTION_ITEM_PREFIX}[*]`,
    matches: (name: string) => name.startsWith(HIDE_COLLECTION_ITEM_PREFIX),
    type: "necessary",
    description:
      "Stores whether a collection item has been hidden (for a specific collection item id)",
  },
  {
    name: `${HIDE_SPOTLIGHT_ITEM_PREFIX}[*]`,
    matches: (name: string) => name.startsWith(HIDE_SPOTLIGHT_ITEM_PREFIX),
    type: "necessary",
    description:
      "Stores whether a spotlight item has been hidden (for a specific spotlight item id)",
  },
  {
    name: `${HIDE_FORUM_EVENT_BANNER_PREFIX}[*]`,
    matches: (name: string) => name.startsWith(HIDE_FORUM_EVENT_BANNER_PREFIX),
    type: "necessary",
    description: "Stores whether a forum event banner has been hidden",
  },
  {
    name: "hide_import_eag_profile",
    type: "necessary",
    description:
      "Controls whether the EAG profile import banner is shown or hidden on the edit profile page",
  },
  {
    name: "hide_more_from_the_forum_recommendations",
    type: "necessary",
    description: 'Don\'t show the "More from the forum" recommendations section',
  },
  {
    name: "hide_new_post_how_to_guide",
    type: "necessary",
    description: "Don't show the how-to guide on the new post page",
  },
  {
    name: "last_visited_frontpage",
    type: "functional",
    description: "Stores the date of the user's last visit to the frontpage",
  },
  {
    name: "posts_list_view_type",
    type: "necessary",
    description: "Whether to display post lists as list items or card items",
  },
  {
    name: "hide_eag_banner",
    type: "necessary",
    description: "Don't show any EAG(x) banners",
  },

  // Third party cookies
  {
    name: "intercom-session-[*]",
    matches: (name: string) => name.startsWith("intercom-session-"),
    type: "functional",
    thirdPartyName: "Intercom",
    description: "Session cookie used by Intercom",
  },
  {
    name: "intercom-id-[*]",
    matches: (name: string) => name.startsWith("intercom-id-"),
    type: "functional",
    thirdPartyName: "Intercom",
    description: "ID cookie used by Intercom",
  },
  {
    name: "intercom-device-id-[*]",
    matches: (name: string) => name.startsWith("intercom-id-"),
    type: "functional",
    thirdPartyName: "Intercom",
    description: "Device ID cookie used by Intercom",
  },
  {
    name: "intercom-[*]",
    matches: (name: string) => name.startsWith("intercom-"),
    type: "functional",
    thirdPartyName: "Intercom",
    description: "Miscellaneous cookies which may be set by Intercom",
  },
  {
    name: "dd_cookie_test_",
    type: "analytics",
    thirdPartyName: "Datadog",
    description: "Cookie used by Datadog to test if cookies are enabled",
  },
  {
    name: "_dd_s",
    type: "analytics",
    thirdPartyName: "Datadog",
    description: "Main cookie used by datadog to track sessions",
  },
  {
    name: "_hjTLDTest",
    type: "functional",
    thirdPartyName: "Hotjar",
    description:
      "When the Hotjar script executes we try to determine the most generic cookie path we should use, instead of the page hostname. This is done so that cookies can be shared across subdomains (where applicable). To determine this, we try to store the _hjTLDTest cookie for different URL substring alternatives until it fails. After this check, the cookie is removed.",
  },
  {
    name: "_hjSessionUser_[*]",
    matches: (name: string) => name.startsWith("_hjSessionUser_"),
    type: "functional",
    thirdPartyName: "Hotjar",
    description:
      "Hotjar cookie that is set when a user first lands on a page with the Hotjar script. It is used to persist the Hotjar User ID, unique to that site on the browser. This ensures that behavior in subsequent visits to the same site will be attributed to the same user ID.",
  },
  {
    name: "_hjIncludedInSessionSample_[*]",
    matches: (name: string) => name.startsWith("_hjIncludedInSessionSample_"),
    type: "functional",
    thirdPartyName: "Hotjar",
    description: "Whether the current user is included in the session sample.",
  },
  {
    name: "_hjFirstSeen",
    type: "functional",
    thirdPartyName: "Hotjar",
    description:
      "Identifies a new user's first session on a website, indicating whether or not Hotjar's seeing this user for the first time.",
  },
  {
    name: "_hjAbsoluteSessionInProgress",
    type: "functional",
    thirdPartyName: "Hotjar",
    description:
      "This cookie is used by HotJar to detect the first pageview session of a user. This is a True/False flag set by the cookie.",
  },
  {
    name: "_gid",
    type: "analytics",
    thirdPartyName: "Google",
    description:
      "This cookie name is associated with Google Universal Analytics. This appears to be a new cookie and as of Spring 2017 no information is available from Google. It appears to store and update a unique value for each page visited.",
  },
  {
    name: "_ga",
    type: "analytics",
    thirdPartyName: "Google",
    description:
      "This cookie name is associated with Google Universal Analytics. This cookie is used to distinguish unique users by assigning a randomly generated number as a client identifier.",
  },
  {
    name: "_dc_gtm_UA[*]",
    matches: (name: string) => name.startsWith("_dc_gtm_UA"),
    type: "analytics",
    thirdPartyName: "Google",
    description:
      "Used by Google Tag Manager to control the loading of a Google Analytics script tag.",
  },
  {
    name: "__Host-GAPS",
    type: "necessary",
    thirdPartyName: "Google",
    description:
      "This cookie name is associated with Google. It is set by Google to identify the user and is used in support of the Google Identity application.",
  },
  {
    name: "(various)",
    type: "analytics",
    thirdPartyName: "Google ReCaptcha",
    description:
      "Google ReCaptcha may set a number of cookies under the 'google.com' domain in order to check for suspicious activity. The full list of known possible cookies are: __Secure-3PSIDCC, __Secure-1PSIDCC, SIDCC, __Secure-3PAPISID, SSID, __Secure-1PAPISID, HSID, __Secure-3PSID, __Secure-1PSID, SID, SAPISID, APISID, NID, OTZ, 1P_JAR, AEC, DV, __Secure-ENID",
  },
] as const satisfies CookieDefinition[];

export type CookieName = (typeof allCookies)[number]["name"];

export const cookiesTable = keyBy(
  allCookies.map((cookie) => ({
    maxExpires: "24 months",
    matches: (name) => name === cookie.name,
    ...cookie,
  })),
  "name",
) as Record<CookieName, CookieSignature>;

const cookieTypes = new TupleSet(["necessary", "functional", "analytics"] as const);

export type CookieType = UnionOf<typeof cookieTypes>;

export const ONLY_NECESSARY_COOKIES: CookieType[] = ["necessary"];

export const ALL_COOKIES: CookieType[] = ["necessary", "functional", "analytics"];

const getCookieByName = (cookies: Cookies, name: CookieName) => cookies.get(name);

export const isValidCookieTypeArray = (
  types?: string[] | null,
): types is CookieType[] => {
  if (!types) {
    return false;
  }
  return types.every((type) => cookieTypes.has(type));
};

/**
 * Non-hook version of useCookiePreferences for use outside of React. Returns
 * the list of allowed cookie types and whether the user has given explicit
 * consent (if they are outside the EU, this will always be true).
 *
 * IMPORTANT NOTE: update useCookiePreferences to match the behaviour here if
 * you change this.
 */
export const getCookiePreferences = async (): Promise<{
  cookiePreferences: CookieType[];
  explicitConsentGiven: boolean;
}> => {
  const cookies = new Cookies();
  const preferencesValue = getCookieByName(cookies, "cookie_preferences");
  const consentTimestamp = getCookieByName(cookies, "cookie_consent_timestamp");
  const explicitConsentGiven =
    !!consentTimestamp && isValidCookieTypeArray(preferencesValue);

  const explicitConsentRequired = await getExplicitConsentRequiredAsync();
  const fallbackPreferences: CookieType[] = explicitConsentRequired
    ? ONLY_NECESSARY_COOKIES
    : ALL_COOKIES;
  const cookiePreferences = explicitConsentGiven
    ? preferencesValue
    : fallbackPreferences;

  return { cookiePreferences, explicitConsentGiven };
};

export const isCookieAllowed = (
  name: CookieName,
  cookieTypesAllowed: CookieType[],
): boolean => {
  const cookie = cookiesTable[name];
  if (cookie) {
    return cookieTypesAllowed.includes(cookie.type);
  }

  for (const cookieName in cookiesTable) {
    const cookie = cookiesTable[cookieName as CookieName];
    if (cookie.matches(name)) {
      return cookieTypesAllowed.includes(cookie.type);
    }
  }

  console.error(`Unknown cookie: ${name}`);
  return false;
};

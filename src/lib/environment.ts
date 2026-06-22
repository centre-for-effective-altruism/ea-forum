import Bowser from "bowser";
import type { JsonRecord } from "./typeHelpers";

export const isServer = typeof window === "undefined";

export const isClient = !isServer;

if (isServer && process.env.ENVIRONMENT !== process.env.NEXT_PUBLIC_ENVIRONMENT) {
  console.error(
    "Mismatched ENVIRONMENT settings:",
    process.env.ENVIRONMENT,
    process.env.NEXT_PUBLIC_ENVIRONMENT,
  );
}

const isEnv = (env: string) =>
  process.env.NEXT_PUBLIC_ENVIRONMENT === env || process.env.ENVIRONMENT === env;

export const isProduction = isEnv("prod");

export const isStaging = isEnv("staging");

export const isDevelopment = isEnv("dev");

export const isBotSite = process.env.NEXT_PUBLIC_IS_BOT_SITE === "true";

export const isNoIndexSite =
  isBotSite || process.env.NEXT_PUBLIC_NO_INDEX === "true";

const userAgent = new (class {
  private bowser: Bowser.Parser.Parser | null = null;

  private getBowser(): Bowser.Parser.Parser {
    if (isServer) {
      throw new Error("Can't detect user agent on server");
    }
    if (!this.bowser) {
      this.bowser = Bowser.getParser(window.navigator.userAgent);
    }
    return this.bowser;
  }

  isMobile() {
    // Platform type is one of: mobile, tablet, desktop, tv or bot
    return this.getBowser().getPlatformType() === "mobile";
  }

  isTablet() {
    // Platform type is one of: mobile, tablet, desktop, tv or bot
    return this.getBowser().getPlatformType() === "tablet";
  }

  isChrome() {
    return this.getBowser().getBrowserName() === "Chrome";
  }

  isFirefox() {
    return this.getBowser().getBrowserName() === "Firefox";
  }

  isSafari() {
    return this.getBowser().getBrowserName() === "Safari";
  }

  os() {
    return this.getBowser().getOS().name ?? null;
  }
})();

/**
 * Returns whether this is a mobile device (according to heuristics in the
 * bowser library). Only usable on the client. Do NOT use this inside a
 * component function outside of an event handler, since that will create
 * an SSR mismatch. If you're thinking of using this to change layout/
 * presentation, this is probably not what you want; use CSS breakpoints
 * instead.
 */
export const isMobile = () => isClient && userAgent.isMobile();

export const isAnyTest = () => process.env.VITEST === "true";

export const getBrowserProperties = (): JsonRecord => {
  if (!isClient || !window?.navigator?.userAgent) {
    return {};
  }
  return {
    userAgent: window?.navigator?.userAgent,
    mobile: userAgent.isMobile(),
    tablet: userAgent.isTablet(),
    chrome: userAgent.isChrome(),
    firefox: userAgent.isFirefox(),
    safari: userAgent.isSafari(),
    osname: userAgent.os(),
    blocksGA: !window.ga?.create,
    blocksGTM: !window.google_tag_manager,
  };
};

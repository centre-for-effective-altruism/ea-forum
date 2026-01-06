import Bowser from "bowser";

export const isServer = typeof window === "undefined";

export const isClient = !isServer;

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

export const isAnyTest = () => false;

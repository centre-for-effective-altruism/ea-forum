import { useSyncExternalStore } from "react";
import { isClient } from "../environment";

// A single shared `(hover: none)` query + listener for the whole app, rather
// than one per consumer — `useIsTouchDevice` is called from every tooltip, of
// which there can be many on a page.
const query =
  isClient && "matchMedia" in window ? window.matchMedia("(hover: none)") : null;

let matches = query?.matches ?? false;
const subscribers = new Set<() => void>();
let listening = false;

const subscribe = (onChange: () => void) => {
  // Older iOS Safari lacks addEventListener on MediaQueryList.
  if (!listening && query?.addEventListener) {
    listening = true;
    query.addEventListener("change", (ev) => {
      matches = ev.matches;
      subscribers.forEach((cb) => cb());
    });
  }
  subscribers.add(onChange);
  return () => {
    subscribers.delete(onChange);
  };
};

/**
 * Returns true on touch / coarse-pointer devices (phones, tablets) where hover
 * isn't available. Used to suppress hover-triggered UI such as tooltips, which
 * are awkward on mobile. Returns false during SSR / first paint so it matches
 * desktop, then corrects on the client.
 */
export const useIsTouchDevice = () =>
  useSyncExternalStore(
    subscribe,
    () => matches,
    () => false,
  );

import type { MouseEvent } from "react";

export const isRegularClick = (ev: MouseEvent) => {
  if (!ev) {
    return false;
  }
  return ev.button === 0 && !ev.ctrlKey && !ev.shiftKey && !ev.altKey && !ev.metaKey;
};

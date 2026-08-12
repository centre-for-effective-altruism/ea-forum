import type { SyntheticEvent } from "react";
/**
 * Get the y-position of a DOM element by following the chain of `offsetParent`
 * links and adding up `offsetTop`.
 */
export const getOffsetChainTop = (element: HTMLElement) => {
  let y = 0;
  let pos: HTMLElement | null = element;
  while (pos) {
    if (pos.offsetTop) {
      y += pos.offsetTop;
    }
    pos = pos.offsetParent as HTMLElement | null;
  }
  return y;
};

/**
 * If an image fails to load some browsers show an ugly white border that
 * we should hide
 */
export const hideBrokenImage = (ev: SyntheticEvent<HTMLImageElement, Event>) => {
  (ev.target as HTMLImageElement).style.visibility = "hidden";
};

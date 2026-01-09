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

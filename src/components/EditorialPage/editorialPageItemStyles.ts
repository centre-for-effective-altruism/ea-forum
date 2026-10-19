import clsx from "clsx";

/**
 * The shell shared by the cards and the list rows: read posts take the page's
 * colour, and hovering one takes the hover colour. Hover is limited to devices
 * with a real pointer so that a tap doesn't leave a row looking hovered.
 */
export const editorialPageItemClasses = (isRead: boolean) =>
  clsx(
    `
      cursor-pointer flex flex-col
      pointer-fine:hover:bg-[var(--editorial-hover)]
      pointer-fine:hover:text-[var(--editorial-theme)]
    `,
    isRead ? "bg-[var(--editorial-theme)]" : "bg-always-white",
  );

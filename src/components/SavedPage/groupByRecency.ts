const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Splits items into "Today", "Yesterday" and "Older" groups in the given
 * timezone, omitting empty groups. Items keep their original order.
 */
export const groupByRecency = <T>(
  items: T[],
  getDate: (item: T) => string | null | undefined,
  timezone: string,
  now = new Date(),
) => {
  const dayKey = (date: Date) =>
    date.toLocaleDateString("en-CA", { timeZone: timezone });
  const today = dayKey(now);
  const yesterday = dayKey(new Date(now.getTime() - ONE_DAY_MS));
  const groups: { title: string; items: T[] }[] = [
    { title: "Today", items: [] },
    { title: "Yesterday", items: [] },
    { title: "Older", items: [] },
  ];
  for (const item of items) {
    const date = getDate(item);
    const key = date ? dayKey(new Date(date)) : null;
    const index = key === today ? 0 : key === yesterday ? 1 : 2;
    groups[index].items.push(item);
  }
  return groups.filter(({ items }) => items.length > 0);
};

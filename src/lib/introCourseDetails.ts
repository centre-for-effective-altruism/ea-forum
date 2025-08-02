import { getTimezone } from "./hooks/useTimezone";

// See https://www.effectivealtruism.org/virtual-programs for more info,
// including the current deadline / start / end dates.
export const getIntroCourseDetails = () => {
  const { timezone } = getTimezone();
  const now = new Date();

  // Helper function to convert a date to the specified timezone
  const convertToTimezone = (date: Date, timezone: string) => {
    return new Date(date.toLocaleString("en-US", { timeZone: timezone }));
  };

  // Find the next deadline for applying to the Intro VP, which is usually the
  // 4th Sunday of every month (though it will sometimes move to the 3rd or 5th
  // Sunday - this is not accounted for in the code). This defaults to the
  // Sunday in the week of the 28th day of this month.
  const deadline = convertToTimezone(now, timezone);
  deadline.setDate(28);

  // Find the next Sunday
  const day = deadline.getDay();
  const diffToSunday = day === 0 ? 0 : 7 - day;
  deadline.setDate(deadline.getDate() + diffToSunday);
  deadline.setHours(23, 59, 59, 999); // End of the day

  // If that Sunday is in the past, use next month's 4th Sunday.
  if (deadline < now) {
    deadline.setMonth(deadline.getMonth() + 1);
    deadline.setDate(28);

    const day = deadline.getDay();
    const diffToSunday = day === 0 ? 0 : 7 - day;
    deadline.setDate(deadline.getDate() + diffToSunday);
  }

  // VP starts 22 days after the deadline, on a Monday
  const start = new Date(deadline);
  start.setDate(start.getDate() + 22);

  // Find the next Monday
  const dayOfWeek = start.getDay();
  const diffToMonday = dayOfWeek === 1 ? 0 : (7 - dayOfWeek + 1) % 7;
  start.setDate(start.getDate() + diffToMonday);

  // VP ends 8 weeks after the start (subtract a day to end on a Sunday)
  const end = new Date(start);
  end.setDate(end.getDate() + 7 * 8 - 1);

  return { deadline, start, end };
};

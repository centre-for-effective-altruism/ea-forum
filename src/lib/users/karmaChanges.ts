import type { CurrentUser } from "./currentUser";
import { addTime, earliest, nDaysAgo, subtractTime } from "../timeUtils";
import { htmlToTextDefault } from "../utils/htmlToText";
import { fetchKarmaChanges } from "./userQueries";
import {
  defaultKarmaChangeSettings,
  AnyKarmaChange,
  CommentKarmaChange,
  KarmaChanges,
  KarmaChangeSettings,
  PostKarmaChange,
  RevisionsKarmaChange,
} from "./karmaChangesTypes";

const dayOfWeekMap: Record<KarmaChangeSettings["dayOfWeekGMT"], number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const getKarmaChangeDateRange = ({
  settings,
  now,
  lastOpened,
  lastBatchStart,
}: {
  settings: KarmaChangeSettings;
  now: Date;
  lastOpened?: Date | null;
  lastBatchStart?: Date | null;
}): { start: Date; end: Date } | null => {
  // Greatest date prior to lastOpened at which the time of day matches
  // settings.timeOfDay.
  const todaysDailyReset = new Date(now);
  todaysDailyReset.setUTCHours(Math.floor(settings.timeOfDayGMT));
  todaysDailyReset.setUTCMinutes(Math.round(60 * (settings.timeOfDayGMT % 1)));
  todaysDailyReset.setUTCSeconds(0);
  todaysDailyReset.setUTCMilliseconds(0);

  const lastDailyReset =
    todaysDailyReset > now
      ? subtractTime(todaysDailyReset, 1, "days")
      : todaysDailyReset;

  const previousBatchExists = !!lastBatchStart;

  switch (settings.updateFrequency) {
    case "daily": {
      // Check whether the last time you opened the menu was in the same batch-period
      const openedBeforeNextBatch = lastOpened && lastOpened >= lastDailyReset;

      // If you open the notification menu again before the next batch has started,
      // just return the previous batch
      if (previousBatchExists && openedBeforeNextBatch) {
        // Since we know that we reopened the notifications before the next batch,
        // the last batch will have ended at the last daily reset time
        const lastBatchEnd = lastDailyReset;
        // Sanity check in case lastBatchStart is invalid (eg; not cleared after
        // a settings change)
        if (lastBatchStart < lastBatchEnd) {
          return {
            start: lastBatchStart,
            end: lastBatchEnd,
          };
        }
      }

      // If you've never opened the menu before, then return the last daily batch,
      // else create batch for all periods that happened since you last opened it
      const oneDayPrior = subtractTime(lastDailyReset, 1, "days");
      return {
        start: lastOpened ? earliest(oneDayPrior, lastOpened) : oneDayPrior,
        end: lastDailyReset,
      };
    }

    case "weekly": {
      if (!(settings.dayOfWeekGMT in dayOfWeekMap)) {
        return null;
      }
      // Target day of the week, as an integer 0-6
      const targetDayOfWeekNum = dayOfWeekMap[settings.dayOfWeekGMT];
      const lastDailyResetDayOfWeekNum = lastDailyReset.getUTCDay();

      // Number of days back from today's daily reset to get to a daily reset
      // of the correct day of the week
      const daysOfWeekDiff =
        (lastDailyResetDayOfWeekNum - targetDayOfWeekNum + 7) % 7;

      const lastWeeklyReset = subtractTime(lastDailyReset, daysOfWeekDiff, "days");
      const oneWeekPrior = subtractTime(lastWeeklyReset, 7, "days");

      // Check whether the last time you opened the menu was in the same batch-period
      const openedBeforeNextBatch = lastOpened && lastOpened >= lastWeeklyReset;

      // If you open the notification menu again before the next batch has started,
      // just return the previous batch
      if (previousBatchExists && openedBeforeNextBatch) {
        // Since we know that we reopened the notifications before the next batch,
        // the last batch will have ended at the last daily reset time
        const lastBatchEnd = lastWeeklyReset;
        // Sanity check in case lastBatchStart is invalid (eg not cleared after a
        // settings change)
        if (lastBatchStart! < lastBatchEnd) {
          return {
            start: lastBatchStart,
            end: lastBatchEnd,
          };
        }
      }

      // If you've never opened the menu before, then return the last daily batch,
      // else create batch for all periods that happened since you last opened it
      return {
        start: lastOpened ? earliest(oneWeekPrior, lastOpened) : oneWeekPrior,
        end: lastWeeklyReset,
      };
    }

    case "realtime":
      if (!lastOpened) {
        // If set to realtime and never opened before (eg, you just changed the
        // setting), default to the last 24 hours.
        return {
          start: nDaysAgo(1),
          end: now,
        };
      }
      return {
        start: lastOpened,
        end: now,
      };

    case "disabled":
    default:
      return null;
  }
};

const getKarmaChangeNextBatchDate = (settings: KarmaChangeSettings, now: Date) => {
  switch (settings.updateFrequency) {
    case "daily":
      const lastDailyBatch = getKarmaChangeDateRange({ settings, now });
      const lastDailyReset = lastDailyBatch?.end;
      if (!lastDailyReset) {
        return null;
      }
      return addTime(lastDailyReset, 1, "days");
    case "weekly":
      const lastWeeklyBatch = getKarmaChangeDateRange({ settings, now });
      const lastWeeklyReset = lastWeeklyBatch?.end;
      if (!lastWeeklyReset) {
        return null;
      }
      return addTime(lastWeeklyReset, 7, "days");
    case "disabled":
    case "realtime":
      return null;
  }
};

const COMMENT_DESCRIPTION_LENGTH = 500;

const isPostKarmaChange = (change: AnyKarmaChange): change is PostKarmaChange =>
  "title" in change && !!change.title;

const isCommentKarmaChange = (
  change: AnyKarmaChange,
): change is CommentKarmaChange =>
  "tagCommentType" in change && !!change.tagCommentType;

/**
 * Given an array of karma changes on an account's content,
 * calculates the total karma change for that account,
 * and splits the karma changes into buckets by content type.
 *
 * Takes an optional _id suffix to separately identify these changes.
 */
const categorizeKarmaChanges = (
  changes: AnyKarmaChange[],
  suffix?: string,
): KarmaChanges & { totalChange: number } => {
  const posts: PostKarmaChange[] = [];
  const comments: CommentKarmaChange[] = [];
  const tagRevisions: RevisionsKarmaChange[] = [];

  let totalChange = 0;
  for (const change of changes) {
    totalChange += change.scoreChange;
    if (suffix) {
      change._id += suffix;
    }
    if (isPostKarmaChange(change)) {
      posts.push(change);
    } else if (isCommentKarmaChange(change)) {
      comments.push({
        ...change,
        description: htmlToTextDefault(change.description ?? "").substring(
          0,
          COMMENT_DESCRIPTION_LENGTH,
        ),
      });
    } else {
      // This is a TagRevisionKarmaChange
      tagRevisions.push(change);
    }
  }

  return {
    totalChange,
    posts,
    comments,
    tagRevisions,
  };
};

const calculateOverallKarmaChanges = async ({
  userId,
  startDate,
  endDate,
  showNegative = false,
}: {
  userId: string;
  startDate: Date;
  endDate: Date;
  showNegative?: boolean;
}) => {
  const changes = await fetchKarmaChanges({
    userId,
    startDate,
    endDate,
    showNegative,
  });
  return categorizeKarmaChanges(changes);
};

// "Today" is only relevant for realtime notifications.
const hasTodaysKarmaChanges = (
  updateFrequency: KarmaChangeSettings["updateFrequency"],
  startDate: Date,
  yesterday: Date,
) => updateFrequency === "realtime" && startDate > yesterday;

/**
 * We also display the rest of the karma changes that they got in the past 24
 * hours and in the past week underneath the ones they got since the last time
 * they checked. This reduces the chance that they lose the changes after viewing
 * them once.
 */
const calculateTodaysKarmaChanges = async ({
  userId,
  startDate,
  showNegative = false,
  updateFrequency,
}: {
  userId: string;
  startDate: Date;
  showNegative?: boolean;
  updateFrequency: KarmaChangeSettings["updateFrequency"];
}) => {
  const yesterday = nDaysAgo(1);
  if (hasTodaysKarmaChanges(updateFrequency, startDate, yesterday)) {
    const todaysChanges = await fetchKarmaChanges({
      userId,
      startDate: yesterday,
      endDate: startDate,
      showNegative,
    });
    return categorizeKarmaChanges(todaysChanges, "-today");
  }
  return null;
};

const calculateThisWeeksKarmaChanges = async ({
  userId,
  startDate,
  showNegative = false,
  updateFrequency,
}: {
  userId: string;
  startDate: Date;
  showNegative?: boolean;
  updateFrequency: KarmaChangeSettings["updateFrequency"];
}) => {
  const lastWeek = nDaysAgo(7);
  // "This week" is only relevant for realtime and daily notifications.
  if (["realtime", "daily"].includes(updateFrequency) && startDate > lastWeek) {
    const yesterday = nDaysAgo(1);
    const thisWeeksChanges = await fetchKarmaChanges({
      userId,
      startDate: lastWeek,
      endDate: hasTodaysKarmaChanges(updateFrequency, startDate, yesterday)
        ? yesterday
        : startDate,
      showNegative,
    });
    return categorizeKarmaChanges(thisWeeksChanges, "-thisWeek");
  }
  return null;
};

export const calculateKarmaChanges = async (
  user: CurrentUser,
  startDate?: Date,
  endDate?: Date,
) => {
  const settings = user.karmaChangeNotifierSettings;
  const now = new Date();

  // If date range isn't specified, infer it from user settings
  if (!startDate || !endDate) {
    // If the user has karmaChanges disabled, don't return anything
    if (settings.updateFrequency === "disabled") {
      return null;
    }
    const lastOpened = user.karmaChangeLastOpened;
    const lastBatchStart = user.karmaChangeBatchStart;
    const dateRange = getKarmaChangeDateRange({
      settings,
      lastOpened: lastOpened ? new Date(lastOpened) : null,
      lastBatchStart: lastBatchStart ? new Date(lastBatchStart) : null,
      now,
    });
    if (!dateRange) {
      return null;
    }
    const { start, end } = dateRange;
    startDate = start;
    endDate = end;
  }

  if (startDate > endDate) {
    throw new Error("Karma changes end date must be after start date");
  }

  const nextBatchDate = getKarmaChangeNextBatchDate(settings, now);
  const { showNegativeKarma, updateFrequency } =
    user.karmaChangeNotifierSettings ?? defaultKarmaChangeSettings;

  const args = {
    userId: user._id,
    startDate,
    endDate,
    showNegative: showNegativeKarma,
    updateFrequency,
  };

  const [newChanges, todaysKarmaChanges, thisWeeksKarmaChanges] = await Promise.all([
    calculateOverallKarmaChanges(args),
    calculateTodaysKarmaChanges(args),
    calculateThisWeeksKarmaChanges(args),
  ]);

  return {
    totalChange: newChanges.totalChange,
    startDate,
    endDate,
    nextBatchDate,
    updateFrequency,
    posts: newChanges.posts,
    comments: newChanges.comments,
    tagRevisions: newChanges.tagRevisions,
    todaysKarmaChanges,
    thisWeeksKarmaChanges,
  };
};

"use client";

import { useSyncExternalStore } from "react";
import range from "lodash/range";
import Select from "../Forms/Select";
import Type from "../Type";
import { daysOfWeek } from "@/lib/timeUtils";
import type { NotificationChannelSettings } from "@/lib/notifications/notificationHelpers";
import {
  getTimezoneAbbreviation,
  gmtToLocalTimeOfWeek,
  localToGmtTimeOfWeek,
  type TimeOfWeek,
} from "./timeOfWeek";

type BatchTimeGMT = Pick<
  NotificationChannelSettings,
  "timeOfDayGMT" | "dayOfWeekGMT"
>;

const subscribeToNothing = () => () => {};
const getBrowserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const getServerTimezone = () => "GMT";

const useBrowserTimezone = () =>
  useSyncExternalStore(subscribeToNothing, getBrowserTimezone, getServerTimezone);

const hourOptions = range(24).map((hour) => ({
  value: String(hour),
  label: `${hour}:00`,
}));

const dayOptions = daysOfWeek.map((day) => ({ value: day, label: day }));

export const inlineSelectClassName = "w-auto! py-1! pr-6";

export default function BatchTimePicker({
  frequency,
  value,
  setValue,
  disabled,
}: Readonly<{
  frequency: "daily" | "weekly";
  value: BatchTimeGMT;
  setValue: (value: BatchTimeGMT) => void;
  disabled?: boolean;
}>) {
  const timezone = useBrowserTimezone();
  const localTime = gmtToLocalTimeOfWeek(
    { timeOfDay: value.timeOfDayGMT, dayOfWeek: value.dayOfWeekGMT },
    timezone,
  );

  const applyChange = (change: Partial<TimeOfWeek>) => {
    const { timeOfDay, dayOfWeek } = localToGmtTimeOfWeek(
      { ...localTime, ...change },
      timezone,
    );
    setValue({ timeOfDayGMT: timeOfDay, dayOfWeekGMT: dayOfWeek });
  };

  return (
    <>
      <Type As="span" style="bodySmall">
        at
      </Type>
      <Select
        value={String(localTime.timeOfDay)}
        setValue={(hour) => applyChange({ timeOfDay: Number(hour) })}
        options={hourOptions}
        disabled={disabled}
        className="inline-block"
        selectClassName={inlineSelectClassName}
      />
      <Type As="span" style="bodySmall">
        {getTimezoneAbbreviation(timezone)}
      </Type>
      {frequency === "weekly" && (
        <>
          <Type As="span" style="bodySmall">
            on
          </Type>
          <Select
            value={localTime.dayOfWeek}
            setValue={(dayOfWeek) => applyChange({ dayOfWeek })}
            options={dayOptions}
            disabled={disabled}
            className="inline-block"
            selectClassName={inlineSelectClassName}
          />
        </>
      )}
    </>
  );
}

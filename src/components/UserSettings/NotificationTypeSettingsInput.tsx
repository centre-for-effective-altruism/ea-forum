"use client";

import clsx from "clsx";
import type {
  NotificationChannel,
  NotificationChannelSettings,
  NotificationTypeSettings,
} from "@/lib/notifications/notificationHelpers";
import ToggleSwitch from "../Forms/ToggleSwitch";
import Select from "../Forms/Select";
import Type from "../Type";
import BatchTimePicker, { inlineSelectClassName } from "./BatchTimePicker";

const channels: { channel: NotificationChannel; label: string }[] = [
  { channel: "onsite", label: "Notify me on-site" },
  { channel: "email", label: "Notify me by email" },
];

const frequencyOptions: {
  value: NotificationChannelSettings["batchingFrequency"];
  label: string;
}[] = [
  { value: "realtime", label: "immediately" },
  { value: "daily", label: "daily" },
  { value: "weekly", label: "weekly" },
];

export default function NotificationTypeSettingsInput({
  label,
  value,
  setValue,
}: Readonly<{
  label: string;
  value: NotificationTypeSettings;
  setValue: (value: NotificationTypeSettings) => void;
}>) {
  const updateChannel = (
    channel: NotificationChannel,
    changes: Partial<NotificationChannelSettings>,
  ) => setValue({ ...value, [channel]: { ...value[channel], ...changes } });

  return (
    <div
      data-component="NotificationTypeSettingsInput"
      className="flex flex-col gap-1"
    >
      <Type style="bodyMedium" className="text-gray-1000">
        {label}
      </Type>
      {channels.map(({ channel, label: channelLabel }) => {
        const settings = value[channel];
        const { batchingFrequency } = settings;
        return (
          <div
            key={channel}
            className="flex items-center justify-between gap-2 sm:pl-2"
          >
            <div
              className={clsx(
                "flex flex-wrap items-center gap-x-1 gap-y-0.5",
                settings.enabled ? "text-gray-900" : "text-gray-600",
              )}
            >
              <Type As="span" style="bodySmall">
                {channelLabel}
              </Type>
              <Select
                value={batchingFrequency}
                setValue={(frequency) =>
                  updateChannel(channel, { batchingFrequency: frequency })
                }
                options={frequencyOptions}
                disabled={!settings.enabled}
                className="inline-block"
                selectClassName={inlineSelectClassName}
              />
              {batchingFrequency !== "realtime" && (
                <BatchTimePicker
                  frequency={batchingFrequency}
                  value={settings}
                  setValue={(batchTime) => updateChannel(channel, batchTime)}
                  disabled={!settings.enabled}
                />
              )}
            </div>
            <ToggleSwitch
              value={settings.enabled}
              setValue={(enabled) => updateChannel(channel, { enabled })}
              ariaLabel={`${label}: ${channelLabel}`}
            />
          </div>
        );
      })}
    </div>
  );
}

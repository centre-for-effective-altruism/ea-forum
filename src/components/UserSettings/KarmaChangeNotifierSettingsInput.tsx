"use client";

import { useId } from "react";
import {
  defaultKarmaChangeSettings,
  type KarmaChangeSettings,
  type KarmaChangeUpdateFrequency,
} from "@/lib/users/karmaChangesTypes";
import { RadioGroup } from "../Forms/RadioGroup";
import Checkbox from "../Forms/Checkbox";
import Type from "../Type";
import BatchTimePicker from "./BatchTimePicker";

const updateFrequencyOptions: {
  value: KarmaChangeUpdateFrequency;
  label: string;
}[] = [
  { value: "disabled", label: "Disabled" },
  { value: "daily", label: "Batched daily" },
  { value: "weekly", label: "Batched weekly" },
  { value: "realtime", label: "Realtime" },
];

export default function KarmaChangeNotifierSettingsInput({
  value,
  setValue,
}: Readonly<{
  value: KarmaChangeSettings | null;
  setValue: (value: KarmaChangeSettings) => void;
}>) {
  const showNegativeKarmaId = useId();
  const settings = value ?? defaultKarmaChangeSettings;
  const { updateFrequency } = settings;
  const updateSettings = (changes: Partial<KarmaChangeSettings>) =>
    setValue({ ...settings, ...changes });

  return (
    <div
      data-component="KarmaChangeNotifierSettingsInput"
      className="flex flex-col gap-2"
    >
      <Type style="bodyMedium" className="text-gray-1000">
        Vote and reaction notifications
      </Type>
      <Type style="bodySmall" className="text-gray-600">
        Shows reactions, upvotes and downvotes on your posts and comments on top of
        the page. By default, this is on but only updates once per day, to avoid
        creating a distracting temptation to frequently recheck it. Can be set to
        real time (removing the batching), disabled (to remove it from the header
        entirely), or to some other update interval.
      </Type>
      <RadioGroup
        value={updateFrequency}
        onChange={(newUpdateFrequency) =>
          updateSettings({ updateFrequency: newUpdateFrequency })
        }
        options={updateFrequencyOptions}
        className="sm:pl-2"
      />
      {(updateFrequency === "daily" || updateFrequency === "weekly") && (
        <div
          className="
            flex flex-wrap items-center gap-x-1 gap-y-0.5 text-gray-900 sm:pl-2
          "
        >
          <Type As="span" style="bodySmall">
            Update
          </Type>
          <BatchTimePicker
            frequency={updateFrequency}
            value={settings}
            setValue={updateSettings}
          />
        </div>
      )}
      {updateFrequency === "realtime" && (
        <Type style="bodySmall" className="text-gray-600">
          Warning: Immediate karma updates may lead to over-updating on tiny amounts
          of feedback, and to checking the site frequently when you&apos;d rather be
          doing something else.
        </Type>
      )}
      <Checkbox
        label={{
          id: showNegativeKarmaId,
          text: "Show negative karma notifications",
        }}
        checked={settings.showNegativeKarma}
        onChange={(showNegativeKarma) => updateSettings({ showNegativeKarma })}
        className="sm:pl-2"
      />
    </div>
  );
}

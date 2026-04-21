import clsx from "clsx";
import { ChangeEvent, useCallback } from "react";
import { typeStyles } from "../Type";
import ThickChevronDownIcon from "../Icons/ThickChevronDownIcon";

export default function OnboardingSelect<T extends string>({
  value,
  setValue,
  options,
}: Readonly<{
  value: T | null;
  setValue: (value: T | null) => void;
  options: {
    value: T;
    label: string;
  }[];
}>) {
  const onChange = useCallback(
    (ev: ChangeEvent<HTMLSelectElement>) => {
      setValue((ev.target.value as T) || null);
    },
    [setValue],
  );
  return (
    <div data-component="OnboardingSelect" className="relative">
      <select
        value={value ?? ""}
        onChange={onChange}
        className={clsx(
          "w-full p-4 rounded bg-login-input text-gray-1000! border-none resize-none",
          "hover:bg-login-input-hover active:bg-login-input-hover outline-none",
          "placeholder:text-gray-600 appearance-none",
          typeStyles.bodyMedium,
        )}
      >
        <option />
        {options.map(({ value, label }) => (
          <option value={value} key={value}>
            {label}
          </option>
        ))}
      </select>
      <ThickChevronDownIcon className="absolute right-3 h-full text-gray-600" />
    </div>
  );
}

import { ChangeEvent, useCallback, useId } from "react";
import clsx from "clsx";

type Option<T extends string> = {
  label: string;
  value: T;
};

type InlineSelectProps<T extends string> = {
  value: T;
  setValue: (value: T) => void;
  options: Option<T>[];
  placeholder?: string;
  className?: string;
};

export default function InlineSelect<T extends string>({
  value,
  setValue,
  options,
  placeholder,
  className,
}: Readonly<InlineSelectProps<T>>) {
  const id = useId();
  const onChange = useCallback(
    (ev: ChangeEvent<HTMLSelectElement>) => {
      setValue(ev.target.value as T);
    },
    [setValue],
  );
  return (
    <select
      data-component="InlineSelect"
      id={id}
      value={value}
      onChange={onChange}
      className={clsx(
        "inline text-sm bg-gray-0 text-primary font-[600] cursor-pointer",
        "disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed",
        "bg-none appearance-none",
        className,
      )}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

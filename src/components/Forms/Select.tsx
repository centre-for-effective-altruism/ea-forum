import { ChangeEvent, useCallback, useId } from "react";
import clsx from "clsx";
import Label from "./Label";

type Option<T extends string> = {
  label: string;
  value: T;
};

type SelectProps<T extends string> = {
  value: T;
  setValue: (value: T) => void;
  options: Option<T>[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  selectClassName?: string;
};

export default function Select<T extends string>({
  value,
  setValue,
  options,
  label,
  placeholder,
  disabled = false,
  className,
  selectClassName,
}: Readonly<SelectProps<T>>) {
  const id = useId();
  const onChange = useCallback(
    (ev: ChangeEvent<HTMLSelectElement>) => {
      setValue(ev.target.value as T);
    },
    [setValue],
  );
  return (
    <div data-component="Select" className={className}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={onChange}
        className={clsx(
          "block w-full px-1 py-2 text-sm bg-gray-0 text-gray-900",
          "border-b-2 border-primary active:bg-gray-100 cursor-pointer",
          "disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed",
          selectClassName,
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
    </div>
  );
}

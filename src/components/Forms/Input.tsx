import clsx from "clsx";
import { ChangeEvent, useCallback, useId } from "react";
import Label from "./Label";

export default function Input({
  value,
  setValue,
  label,
  placeholder,
  readOnly,
  multiline,
  disabled,
  onClick,
  className,
  inputClassName,
}: Readonly<{
  value: string;
  setValue: (value: string) => void;
  label?: string;
  placeholder?: string;
  readOnly?: boolean;
  multiline?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  inputClassName?: string;
}>) {
  const id = useId();
  const onChange = useCallback(
    (ev: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValue(ev.target.value);
    },
    [setValue],
  );
  const As = multiline ? "textarea" : "input";
  return (
    <div data-component="Input" className={className}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <As
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        disabled={disabled}
        onClick={onClick}
        className={clsx(
          "clock w-full px-1 py-2 text-sm bg-gray-0 text-gray-900 outline-none",
          "border-b-2 border-gray-400 focus:border-primary cursor-text transition-all",
          "disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed",
          inputClassName,
        )}
      />
    </div>
  );
}

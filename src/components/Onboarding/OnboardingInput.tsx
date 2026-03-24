import { ChangeEvent, RefObject, useCallback } from "react";
import { typeStyles } from "../Type";
import clsx from "clsx";

export default function OnboardingInput({
  value,
  setValue,
  placeholder,
  As = "input",
  rows,
  inputRef,
  disabled,
  className,
}: Readonly<{
  value: string;
  setValue: (value: string) => void;
  placeholder: string;
  As?: "input" | "textarea";
  rows?: number;
  inputRef?:
    | RefObject<HTMLInputElement | null>
    | RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
  className?: string;
}>) {
  const onChange = useCallback(
    (ev: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>) => {
      setValue(ev.target.value ?? "");
    },
    [setValue],
  );
  return (
    <As
      value={value}
      type={As === "input" ? "text" : undefined}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      // @ts-expect-error This is tricky since it can be an `input` or `textarea`
      ref={inputRef}
      disabled={disabled}
      className={clsx(
        "w-full p-4 rounded bg-login-input text-gray-1000! border-none resize-none",
        "hover:bg-login-input-hover active:bg-login-input-hover outline-none",
        "placeholder:text-gray-600",
        typeStyles.bodyMedium,
        className,
      )}
    />
  );
}

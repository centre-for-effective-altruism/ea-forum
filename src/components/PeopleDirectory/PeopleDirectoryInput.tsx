import { ChangeEvent, ComponentType, RefObject, useCallback } from "react";

export default function PeopleDirectoryInput({
  value,
  setValue,
  Icon,
  noBorder,
  placeholder,
  inputRef,
}: Readonly<{
  value?: string;
  setValue?: (newValue: string) => void;
  Icon?: ComponentType<{ className?: string }>;
  noBorder?: boolean;
  placeholder?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
}>) {
  const onChange = useCallback(
    (ev: ChangeEvent<HTMLInputElement>) => {
      setValue?.(ev.target?.value ?? "");
    },
    [setValue],
  );
  return (
    <div
      data-component="PeopleDirectoryInput"
      className={`
        flex items-center w-ull rounded bg-gray-50 text-gray-1000
        ${noBorder ? "" : "border border-gray-300"}
      `}
    >
      {Icon && <Icon className="h-4 ml-4" />}
      <input
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full bg-transparent p-3 text-[14px] font-[500] outline-none"
        ref={inputRef}
      />
    </div>
  );
}

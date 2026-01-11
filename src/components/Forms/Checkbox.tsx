import { ChangeEvent, useCallback } from "react";
import Type from "../Type";

type CheckboxLabel = {
  id: string;
  text: string;
};

export default function Checkbox({
  label,
  checked,
  onChange,
}: Readonly<{
  label?: CheckboxLabel;
  checked: boolean;
  onChange: (checked: boolean) => void;
}>) {
  const onChange_ = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.checked);
    },
    [onChange],
  );
  return (
    <div data-component="Checkbox" className="flex items-center gap-2">
      <input
        id={label?.id}
        type="checkbox"
        checked={checked}
        onChange={onChange_}
        className="w-4 h-4 rounded border border-gray-400 accent-primary"
      />
      {label && (
        <label htmlFor={label.id} className="cursor-pointer select-none">
          <Type style="bodySmall">{label.text}</Type>
        </label>
      )}
    </div>
  );
}

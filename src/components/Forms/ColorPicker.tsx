import { ChangeEvent, MouseEvent, useCallback, useId } from "react";
import Label from "./Label";
import Type from "../Type";

export default function ColorPicker({
  value,
  setValue,
  clearable,
  label,
  className,
}: Readonly<{
  value: string | null;
  setValue: (value: string | null) => void;
  clearable?: boolean;
  label?: string;
  className?: string;
}>) {
  const id = useId();
  const onChange = useCallback(
    (ev: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValue(ev.target.value);
    },
    [setValue],
  );
  const onChoose = useCallback(
    (ev: MouseEvent) => {
      ev.preventDefault();
      setValue("#0c869b");
    },
    [setValue],
  );
  const onRemove = useCallback(
    (ev: MouseEvent) => {
      ev.preventDefault();
      setValue(null);
    },
    [setValue],
  );
  return (
    <div data-component="ColorPicker" className={className}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="flex items-center gap-3">
        {value ? (
          <>
            <input id={id} type="color" value={value} onChange={onChange} />
            {clearable && (
              <Type
                As="button"
                style="bodyHeavy"
                className="cursor-pointer text-primary-dark hover:text-primary"
                onClick={onRemove}
              >
                Remove
              </Type>
            )}
          </>
        ) : (
          <>
            <div
              aria-hidden
              className="cursor-pointer bg-black border-1 border-gray-500 w-16 h-8"
              onClick={onChoose}
            />
            <Type
              As="button"
              style="bodyHeavy"
              className="cursor-pointer text-primary-dark hover:text-primary"
              onClick={onChoose}
            >
              No color selected - click to choose
            </Type>
          </>
        )}
      </div>
    </div>
  );
}

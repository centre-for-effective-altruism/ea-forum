import clsx from "clsx";

type Option<T extends string> = {
  label: string;
  value: T;
};

type RadioGroupProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  direction?: "vertical" | "horizontal";
  className?: string;
  disabled?: boolean;
};

export function RadioGroup<T extends string>({
  value,
  onChange,
  options,
  direction = "vertical",
  className,
  disabled = false,
}: Readonly<RadioGroupProps<T>>) {
  return (
    <div
      data-component="RadioGroup"
      className={clsx(
        "flex justify-between",
        direction === "vertical" ? "flex-col gap-2" : "gap-x-3 gap-y-2 flex-wrap",
        className,
      )}
    >
      {options.map((option) => (
        <label
          key={option.value}
          className={clsx(
            "flex items-center gap-2 cursor-pointer select-none",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <input
            type="radio"
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            disabled={disabled}
            className="sr-only"
          />
          <span
            className={clsx(
              "w-4 h-4 rounded-full border flex-shrink-0",
              value === option.value
                ? "border-primary bg-primary"
                : "border-gray-300 bg-gray-0",
            )}
          />
          <span className="text-gray-900">{option.label}</span>
        </label>
      ))}
    </div>
  );
}

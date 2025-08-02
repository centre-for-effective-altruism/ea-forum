import { ChangeEvent } from "react";
import EyeIcon from "@heroicons/react/24/solid/EyeIcon";
import EyeSlashIcon from "@heroicons/react/24/solid/EyeSlashIcon";

export default function LoginInput({
  value,
  onChange,
  testId,
  placeholder,
  autoFocus,
  secure,
  onToggleRevealed,
}: Readonly<{
  value: string,
  onChange: (ev: ChangeEvent<HTMLInputElement>) => void,
  testId: string,
  placeholder: string,
  autoFocus?: boolean,
  secure?: "revealed" | "hidden",
  onToggleRevealed?: () => void,
}>) {
  const Icon = secure === "revealed" ? EyeSlashIcon : EyeIcon;
  return (
    <div
      className={`
        flex items-center gap-3 w-full rounded bg-(--color-login-input) px-[17px]
      `}
    >
      <input
        type={secure === "hidden" ? "password" : "text"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        data-testid={testId}
        autoFocus={autoFocus}
        className={`
          grow py-[15px] text-black text-[14px] font-sans font-[500]
          placeholder:text-gray-600 outline-none
        `}
      />
      {secure &&
        <Icon
          onClick={onToggleRevealed}
          title="Reveal password"
          className="w-4 cursor-pointer text-gray-600"
        />
      }
    </div>
  );
}

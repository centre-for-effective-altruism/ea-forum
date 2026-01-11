import type { ComponentType } from "react";
import Tooltip from "../Tooltip";
import Type from "../Type";

export default function HeaderButton({
  Icon,
  description,
  onClick,
}: Readonly<{
  Icon: ComponentType<{ className?: string }>;
  description: string;
  onClick?: () => void;
}>) {
  return (
    <Tooltip title={<Type style="bodySmall">{description}</Type>} placement="bottom">
      <button
        data-component="HeaderButton"
        className="cursor-pointer hover:bg-gray-200 rounded-full p-2"
        onClick={onClick}
      >
        <Icon className="w-[24px] text-gray-600" />
      </button>
    </Tooltip>
  );
}

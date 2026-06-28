import type { ComponentType } from "react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import clsx from "clsx";
import Type from "@/components/Type";
import Link from "@/components/Link";
import Tooltip from "@/components/Tooltip";

export default function NavItem({
  title,
  href,
  description,
  UnselectedIcon,
  SelectedIcon,
  isSelected,
  loggedOutOnly,
}: Readonly<{
  title: string;
  href: string;
  description: string;
  UnselectedIcon: ComponentType<{ className: string }>;
  SelectedIcon: ComponentType<{ className: string }>;
  isSelected: boolean;
  loggedOutOnly?: boolean;
}>) {
  const { currentUser } = useCurrentUser();
  if (loggedOutOnly && currentUser) {
    return null;
  }

  const Icon = isSelected ? SelectedIcon : UnselectedIcon;
  const className = isSelected ? "text-gray-1000 font-[600]" : "text-gray-600";
  return (
    <Tooltip
      title={
        <Type style="bodySmall" className="max-w-[300px]">
          {description}
        </Type>
      }
      placement="right"
      className="whitespace-nowrap"
    >
      <Type style="body" data-component="NavItem">
        <Link
          href={href}
          className={clsx(
            "flex items-center gap-3 hover:text-gray-1000 py-2.5",
            className,
          )}
        >
          <Icon className="w-5" /> {title}
        </Link>
      </Type>
    </Tooltip>
  );
}

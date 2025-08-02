import type { ComponentType } from "react";
import Type from "./Type";
import Link from "./Link";

export default function NavItem({
  title,
  href,
  UnselectedIcon,
  SelectedIcon,
  isSelected,
}: Readonly<{
  title: string,
  href: string,
  description: string,
  UnselectedIcon: ComponentType<{className: string}>,
  SelectedIcon: ComponentType<{className: string}>,
  isSelected: boolean,
  loggedOutOnly?: boolean, // TODO
}>) {
  const Icon = isSelected ? SelectedIcon : UnselectedIcon;
  const className = isSelected ? "text-black font-[600]" : "text-gray-600";
  return (
    <Type style="body" data-component="NavItem">
      <Link
        href={href}
        className={`flex items-center gap-2 hover:text-black py-2 ${className}`}
      >
        <Icon className="w-5" /> {title}
      </Link>
    </Type>
  );
}

import { Suspense, type ComponentType, type ReactNode } from "react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import clsx from "clsx";
import Type from "@/components/Type";
import Link from "@/components/Link";

function LoggedOutOnly({ children }: Readonly<{ children: ReactNode }>) {
  const { currentUser } = useCurrentUser();
  return currentUser ? null : children;
}

export default function NavItem({
  title,
  href,
  UnselectedIcon,
  SelectedIcon,
  isSelected,
  loggedOutOnly,
}: Readonly<{
  title: string;
  href: string;
  UnselectedIcon: ComponentType<{ className: string }>;
  SelectedIcon: ComponentType<{ className: string }>;
  isSelected: boolean;
  loggedOutOnly?: boolean;
}>) {
  const Icon = isSelected ? SelectedIcon : UnselectedIcon;
  const className = isSelected ? "text-gray-1000 font-[600]" : "text-gray-600";
  const item = (
    <Type style="body" data-component="NavItem">
      <Link
        href={href}
        className={clsx(
          "flex items-center gap-3 whitespace-nowrap rounded pl-3 pr-5 -mx-3 py-2.5",
          "hover:bg-item-hover hover:text-gray-800",
          className,
        )}
      >
        <Icon className="w-5" /> {title}
      </Link>
    </Type>
  );
  return loggedOutOnly ? (
    <Suspense fallback={null}>
      <LoggedOutOnly>{item}</LoggedOutOnly>
    </Suspense>
  ) : (
    item
  );
}

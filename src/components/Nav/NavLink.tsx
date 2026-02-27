import clsx from "clsx";
import Link from "@/components/Link";
import Type from "@/components/Type";

export default function NavLink({
  title,
  href,
  onClick,
  isSelected,
}: Readonly<{
  title: string;
  href?: string;
  onClick?: () => void;
  isSelected: boolean;
}>) {
  const className = clsx(
    "block py-1 hover:text-gray-1000",
    isSelected ? "text-gray-1000 font-[600]" : "text-gray-600",
  );
  return (
    <Type style="bodySmall" data-component="NavLink">
      {href ? (
        <Link href={href} className={className}>
          {title}
        </Link>
      ) : (
        <button
          onClick={onClick}
          className={clsx(className, "cursor-pointer w-full text-left")}
        >
          {title}
        </button>
      )}
    </Type>
  );
}

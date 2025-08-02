import Link from "./Link";
import Type from "./Type";

export default function NavLink({title, href, isSelected}: Readonly<{
  title: string,
  href: string,
  isSelected: boolean,
}>) {
  const className = isSelected ? "text-black font-[600]" : "text-gray-600";
  return (
    <Type style="bodySmall" data-component="NavLink">
      <Link
        href={href}
        className={`block py-1 hover:text-black ${className}`}
      >
        {title}
      </Link>
    </Type>
  );
}

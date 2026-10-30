import type { ReactNode } from "react";

export default function SearchPageColumns({
  filters,
  children,
}: Readonly<{
  filters: ReactNode;
  children: ReactNode;
}>) {
  return (
    <div
      data-component="SearchPageColumns"
      className="
        max-w-[1200px] mx-auto px-4 md:px-10 py-8
        md:grid md:grid-cols-[250px_minmax(0,1fr)] gap-10
      "
    >
      <aside className="max-md:hidden">{filters}</aside>
      <div className="min-w-0 flex flex-col">{children}</div>
    </div>
  );
}

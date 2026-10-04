import type { ReactNode } from "react";

/** The column the admin editorial pages share */
export default function AdminEditorialPageColumn({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div
      data-component="AdminEditorialPageColumn"
      className="w-[716px] max-w-full mx-auto my-10 px-2"
    >
      {children}
    </div>
  );
}

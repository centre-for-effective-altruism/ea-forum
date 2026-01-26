import { ReactNode } from "react";

export default function PostsPageLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div
      className="bg-white px-2 pt-[110px] relative"
      data-component="PostsPageLayout"
    >
      {children}
    </div>
  );
}

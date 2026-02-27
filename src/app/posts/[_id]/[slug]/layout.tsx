import { ReactNode } from "react";

export default function PostsPageLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="bg-gray-0 px-2 pt-[110px]" data-component="PostsPageLayout">
      {children}
    </div>
  );
}

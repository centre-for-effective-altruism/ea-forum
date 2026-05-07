import { ReactNode } from "react";

export default function PostsPageLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="px-2 pt-[110px]" data-component="PostsPageLayout">
      {children}
    </div>
  );
}

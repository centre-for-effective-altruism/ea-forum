import type { ReactNode } from "react";
import PostBody from "./PostBody";
import CommentBody from "./CommentBody";

export default function ContentStyles({
  contentType,
  children,
  className,
}: Readonly<{
  contentType: "post" | "comment";
  children: ReactNode;
  className?: string;
}>) {
  const Component = contentType === "post" ? PostBody : CommentBody;
  return <Component className={className}>{children}</Component>;
}

import ContentProgressiveEnhancements from "./ContentProgressiveEnhancements";
import clsx from "clsx";
import "./content-base.css";
import "./tag-body.css";

export default function TagBody({
  html,
  className,
}: Readonly<{
  html: string;
  className?: string;
}>) {
  return (
    <ContentProgressiveEnhancements
      html={html}
      className={clsx("content-base tag-body", className)}
    />
  );
}

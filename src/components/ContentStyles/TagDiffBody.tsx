import TagBody from "./TagBody";
import clsx from "clsx";

export default function TagDiffBody({
  diff,
  className,
}: Readonly<{
  diff: string;
  className?: string;
}>) {
  return (
    <TagBody
      html={diff}
      className={clsx("[&_ins]:bg-diff-added [&_del]:bg-diff-removed", className)}
    />
  );
}

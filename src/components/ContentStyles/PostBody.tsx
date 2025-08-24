import "./post-body.css";

export default function PostBody({
  html,
  className,
}: Readonly<{
  html: string | null;
  className?: string;
}>) {
  if (!html) {
    return null;
  }
  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      className={`post-body ${className}`}
      data-component="PostBody"
    />
  );
}

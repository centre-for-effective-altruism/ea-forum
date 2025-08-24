export default function CommentBody({
  html,
  className = "",
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
      className={`font-sans text-[14px] font-[450] ${className}`}
      data-component="CommentBody"
    />
  );
}

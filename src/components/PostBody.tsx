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
      className={`font-serif font-[12px] ${className}`}
      data-component="PostBody"
    />
  );
}

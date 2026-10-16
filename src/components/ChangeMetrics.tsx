export default function ChangeMetrics({
  changeMetrics,
  verbose,
}: Readonly<{
  changeMetrics: { added: number; removed: number };
  verbose?: boolean;
}>) {
  const added = changeMetrics?.added ?? 0;
  const removed = changeMetrics?.removed ?? 0;
  const showAdded = added > 0 || verbose;
  const showRemoved = removed > 0 || verbose;
  const showSlash = showAdded && showRemoved;
  if (!showAdded && !showRemoved) {
    return null;
  }
  return (
    <span data-component="ChangeMetrics">
      ({showAdded && <span className="text-diff-added-text">+{added}</span>}
      {showSlash && "/"}
      {showRemoved && <span className="text-diff-removed-text">-{removed}</span>}
      {verbose ? " characters" : ""})
    </span>
  );
}

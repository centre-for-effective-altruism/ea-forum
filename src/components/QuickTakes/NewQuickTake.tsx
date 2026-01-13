import clsx from "clsx";

export default function NewQuickTake({
  className,
}: Readonly<{
  className?: string;
}>) {
  return (
    <section
      data-component="NewQuickTake"
      className={clsx("bg-gray-50 border border-gray-100 p-2", className)}
    >
      {/* TODO: This should wrap the new comment form instead
      <Editor
        formType="new"
        collectionName="Comments"
        fieldName="contents"
        placeholder="Share exploratory, draft-stage, rough thoughts..."
        value={{ type: "ckEditorMarkup", value: "" }}
        quickTakesStyles
      />
        */}
    </section>
  );
}

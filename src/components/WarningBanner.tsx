import WarningIcon from "@heroicons/react/24/solid/ExclamationTriangleIcon";

export default function WarningBanner({ messageHtml }: { messageHtml: string }) {
  return (
    <div
      data-component="WarningBanner"
      className="
        flex justify-between gap-2 text-warning bg-warning-translucent
        font-sans text-[14px] font-[500] leading-[20px] p-2 mb-2 rounded
      "
    >
      <WarningIcon className="w-4 transform-[translateY(2px)]" />
      <div
        className="grow [&_a]:underline"
        dangerouslySetInnerHTML={{ __html: messageHtml }}
      />
    </div>
  );
}

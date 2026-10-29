import Image from "next/image";

/**
 * The official wordmark is Inter SemiBold, so we render it as live text next
 * to the symbol. Browsers hint text but not SVG paths, so this stays sharp on
 * low-DPI screens where the SVG logo looks blurry. The size and tracking were
 * matched against the official SVG rendered 24px tall.
 */
export default function SiteLogo() {
  return (
    <span
      className="
        flex items-center gap-[6px] whitespace-nowrap font-sans font-[600]
        text-[21px] leading-none tracking-[-0.035em]
      "
    >
      <Image
        src="/favicon.svg"
        alt=""
        width={15}
        height={24}
        loading="eager"
        className="h-[24px] w-auto"
      />
      <span className="text-logo-wordmark">
        <span className="hidden md:inline">Effective Altruism</span>
        <span className="md:hidden">EA</span>{" "}
        <span className="text-logo-forum">Forum</span>
      </span>
    </span>
  );
}

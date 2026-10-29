import Image from "next/image";

// Full logo is 882x86 and reduced is 396x86; both render 24px tall. Brand
// guidelines say to swap the file on mobile rather than shrink the logo.
const LogoImages = ({ mode }: { mode: "light" | "dark" }) => (
  <>
    <Image
      src={`/ea-forum-logo_full_${mode}-mode.svg`}
      alt="Effective Altruism Forum"
      width={246}
      height={24}
      loading="eager"
      className="hidden md:block h-[24px] w-auto"
    />
    <Image
      src={`/ea-forum-logo_reduced_${mode}-mode.svg`}
      alt="EA Forum"
      width={111}
      height={24}
      loading="eager"
      className="md:hidden h-[24px] w-auto"
    />
  </>
);

/**
 * Light and dark versions only differ in the wordmark colour. Which one is
 * visible is controlled by the theme classes in globals.css.
 */
export default function SiteLogo() {
  return (
    <>
      <span className="site-logo-light flex">
        <LogoImages mode="light" />
      </span>
      <span className="site-logo-dark">
        <LogoImages mode="dark" />
      </span>
    </>
  );
}

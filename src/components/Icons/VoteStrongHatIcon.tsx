import type { SVGProps } from "react";

/**
 * An upward chevron ("hat") that sits just above the base triangle to indicate
 * a strong vote — see the strong-vote rendering in VoteButton. The path traces
 * the base triangle's two upper sides (SoftArrowUpIcon), scaled up slightly, so
 * its angle and width match the triangle below. Flat (butt) ends keep the
 * bottom corners from looking rounded.
 */
export default function VoteStrongHatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 15 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="butt"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M1.75 8 7.5 1.5 13.25 8" />
    </svg>
  );
}

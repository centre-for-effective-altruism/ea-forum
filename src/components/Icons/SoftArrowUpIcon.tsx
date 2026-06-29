import type { SVGProps } from "react";

// The filled triangle outline, in a "0 0 9 6" viewBox. Exported so the strong
// vote can draw a matching chevron in the same coordinate space (see VoteButton).
export const SOFT_ARROW_PATH =
  "M4.11427 0.967669C4.31426 0.725192 4.68574 0.725192 4.88573 0.967669L8.15534 4.93186C8.42431 5.25798 8.19234 5.75 7.76961 5.75H1.23039C0.807659 5.75 0.575686 5.25798 0.844665 4.93186L4.11427 0.967669Z";

export default function SoftArrowUpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="9"
      height="6"
      viewBox="0 0 9 6"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d={SOFT_ARROW_PATH} />
    </svg>
  );
}

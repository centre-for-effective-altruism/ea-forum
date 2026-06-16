import { useLayoutEffect, useRef, useState } from "react";

/**
 * Detect whether an element with a `line-clamp-*` class has actually triggered
 * the line clamping or not.
 */
export const useIsClamped = <T extends HTMLElement = HTMLDivElement>(
  tolerance = 1,
) => {
  const ref = useRef<T>(null);
  const [isClamped, setIsClamped] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const checkClamp = () =>
      setIsClamped(element.scrollHeight > element.clientHeight + tolerance);
    checkClamp();
    const resizeObserver = new ResizeObserver(checkClamp);
    resizeObserver.observe(element);
    window.addEventListener("resize", checkClamp);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", checkClamp);
    };
  }, [ref, tolerance]);

  return { ref, isClamped };
};

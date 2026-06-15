import {
  ElementType,
  ReactNode,
  RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import type { TranslatedAttribs } from "@/lib/utils/contentHelpers";
import HorizScrollBlock from "./HorizScrollBlock";

/**
 * Make an element horizontally scrollable and add blackable arrows at the side,
 * but only if the content is too wide to fit without being scrollable.
 */
export default function MaybeHorizScrollBlock({
  As,
  attribs,
  bodyRef,
  children,
}: Readonly<{
  As: ElementType;
  attribs: TranslatedAttribs;
  bodyRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}>) {
  const contentsRef = useRef<HTMLElement | null>(null);
  const [isScrollable, setIsScrollable] = useState(false);

  useEffect(() => {
    const contents = contentsRef.current;
    const body = bodyRef.current;
    if (contents && body) {
      if (contents.scrollWidth > body.clientWidth && contents.clientWidth > 0) {
        setIsScrollable(true);
      }
    }
  }, [bodyRef]);

  if (isScrollable) {
    return (
      <HorizScrollBlock>
        <As {...attribs} ref={contentsRef}>
          {children}
        </As>
      </HorizScrollBlock>
    );
  }

  return (
    <As {...attribs} ref={contentsRef}>
      {children}
    </As>
  );
}

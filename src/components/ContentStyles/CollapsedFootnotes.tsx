import { ElementType, ReactNode, useCallback, useEffect, useState } from "react";
import { InteractionWrapper } from "@/lib/hooks/useClickableCell";
import { useOnSearchHotkey } from "@/lib/hooks/useGlobalKeydown";
import { useUrlHash } from "@/lib/hooks/useUrlHash";
import {
  locationHashIsFootnote,
  TranslatedAttribs,
} from "@/lib/utils/contentHelpers";
import clsx from "clsx";
import Collapse from "../Collapse";
import Type from "../Type";

const TRANSITION_DURATION = 200;

export const EXPAND_FOOTNOTES_EVENT = "expand-footnotes";

export default function CollapsedFootnotes({
  As,
  previewCount = 3,
  attribs,
  footnoteElements,
}: Readonly<{
  As: ElementType;
  previewCount?: number;
  attribs: TranslatedAttribs;
  footnoteElements: ReactNode[];
}>) {
  const hash = useUrlHash();
  const [collapsed, setCollapsed] = useState(!locationHashIsFootnote(hash));
  const [fullyExpanded, setFullyExpanded] = useState(!collapsed);

  const preview = footnoteElements.slice(0, previewCount);
  const rest = footnoteElements.slice(previewCount);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      setCollapsed(false);
      setTimeout(
        () => {
          document.querySelector(customEvent.detail)?.scrollIntoView();
        },
        fullyExpanded ? 0 : TRANSITION_DURATION,
      );
    };
    window.addEventListener(EXPAND_FOOTNOTES_EVENT, handler);
    return () => window.removeEventListener(EXPAND_FOOTNOTES_EVENT, handler);
  }, [fullyExpanded]);

  const fullyExpand = useCallback(() => setFullyExpanded(true), []);

  const uncollapse = useCallback(() => setCollapsed(false), []);

  useOnSearchHotkey(uncollapse);

  if (!rest.length) {
    return <As {...attribs}>{preview}</As>;
  }

  return (
    <As data-component="CollapsedFootnotes" {...attribs}>
      {preview}
      <Collapse
        open={!collapsed}
        onEntered={fullyExpand}
        timeout={TRANSITION_DURATION}
        className={clsx(collapsed && "-mt-3", fullyExpanded && "overflow-visible!")}
      >
        {rest}
      </Collapse>
      <Collapse open={collapsed} className="mt-3">
        <InteractionWrapper>
          <Type
            As="button"
            style="bodyHeavy"
            className="text-primary hover:opacity-70 cursor-pointer"
            onClick={uncollapse}
          >
            Show all footnotes
          </Type>
        </InteractionWrapper>
      </Collapse>
    </As>
  );
}

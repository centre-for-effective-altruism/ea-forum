"use client";

import { ElementType, FC, ReactNode, RefObject, useMemo, useRef } from "react";
import { parseDocument, ElementType as HtmlElementType } from "htmlparser2";
import type { ChildNode, Document } from "domhandler";
import { translateAttribs, validateUrl } from "@/lib/utils/contentHelpers";
import { useTracking } from "@/lib/analyticsEvents";
import PostPagePollSection from "../Polls/PostPagePollSection";
import MaybeHorizScrollBlock from "../MaybeHorizScrollBlock";
import CollapsedFootnotes from "./CollapsedFootnotes";
import HoverPreviewLink from "./HoverPreviewLink";
import WrappedStrawPoll from "./WrappedStrawPoll";

const HtmlNode: FC<{
  /** The parsed node to render */
  node: ChildNode;
  /** Parsed node for the entire piece of content, which will have node as a child */
  document: Document;
  /** Ref to the outer container for this content */
  bodyRef: RefObject<HTMLDivElement | null>;
  /** Whether or not this is a top level root node */
  root?: boolean;
}> = ({ node, document, bodyRef, root }) => {
  const { captureEvent } = useTracking();
  switch (node.type) {
    case HtmlElementType.Tag: {
      let As = node.tagName.toLowerCase() as ElementType & string;
      if (As === "html" || As === "body" || As === "head") {
        As = "div";
      }

      const attribs = translateAttribs(node.attribs);
      const classNames = node.attribs.class?.split(" ") ?? [];

      const mappedChildren: ReactNode[] = node.childNodes.map((c, i) => (
        <HtmlNode key={i} node={c} document={document} bodyRef={bodyRef} />
      ));

      if (classNames.includes("footnotes")) {
        return (
          <CollapsedFootnotes
            As={As}
            attribs={attribs}
            footnoteElements={mappedChildren}
          />
        );
      }

      let result: ReactNode | ReactNode[] = mappedChildren;

      if (classNames.includes("strawpoll-embed")) {
        result = <WrappedStrawPoll>{result}</WrappedStrawPoll>;
      }

      if (classNames.includes("ck-cta-button")) {
        if (attribs["data-href"]) {
          attribs.href = validateUrl(attribs["data-href"] as string);
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
        const originalOnClick = attribs["onClick"] as Function;
        attribs["onClick"] = (ev: React.MouseEvent<HTMLAnchorElement>) => {
          captureEvent("ctaButtonClicked", { href: attribs["data-href"] as string });
          originalOnClick?.(ev);
        };
      }

      if (classNames.includes("ck-poll")) {
        const forumEventId = attribs["data-internal-id"];
        if (forumEventId) {
          return (
            <PostPagePollSection
              id={forumEventId as string}
              forumEventId={forumEventId as string}
            />
          );
        }
      }

      if (attribs["data-internal-id"]) {
        // If the element has a data-internal-id attribute, translate it into `id`.
        // This is used in some ckeditor plugins (Google Docs import, ckeditor5-poll,
        // internal-block-links) to support internal linking.
        // If the element already has an ID, create a wrapper span with the added ID.
        // Otherwise add it to the element.
        // TODO: The previous implementation of this also checked the document for
        // elements with the same ID, which is not implemented here (and is
        // complicated significantly by render timings). I'm not sure whether that's
        // actually important.
        if (attribs.id) {
          result = <span id={attribs["data-internal-id"] as string}>{result}</span>;
        } else {
          attribs.id = attribs["data-internal-id"];
        }
      }

      if (root && ["p", "div", "table"].includes(As)) {
        return (
          <MaybeHorizScrollBlock As={As} attribs={attribs} bodyRef={bodyRef}>
            {result}
          </MaybeHorizScrollBlock>
        );
      } else if (As === "a") {
        return (
          <HoverPreviewLink
            href={attribs.href as string}
            document={document}
            {...attribs}
          >
            {result}
          </HoverPreviewLink>
        );
      } else if (node.childNodes.length > 0) {
        return <As {...attribs}>{result}</As>;
      }

      return <As {...attribs} />;
    }

    case HtmlElementType.Script: {
      // Embedded script tag. This can appear in posts/etc if they were last edited
      // by an admin (otherwise the validator will have stripped it out).
      const scriptText: string = node.childNodes
        .map((c) => (c.type === HtmlElementType.Text ? c.data : ""))
        .join("");
      return <script>{scriptText}</script>;
    }

    case HtmlElementType.Style: {
      // Embedded style tag. This can appear in posts/etc if they were last edited
      // by an admin (otherwise the validator will have stripped it out). All
      // children must be text nodes.
      const styleText: string = node.childNodes
        .map((c) => (c.type === HtmlElementType.Text ? c.data : ""))
        .join("");
      return <style>{styleText}</style>;
    }

    case HtmlElementType.Text:
      return node.data;

    default:
      return null;
  }
};

type EnhancedContent =
  | {
      html: string;
      document?: never;
    }
  | {
      html?: never;
      document: Document;
    };

export default function ContentProgressiveEnhancements({
  html,
  document: document_,
  className,
}: Readonly<
  EnhancedContent & {
    className?: string;
  }
>) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const document = useMemo(() => {
    return document_ ?? parseDocument(html);
  }, [html, document_]);
  return (
    <div data-component="ContentItemBody" ref={bodyRef} className={className}>
      {document.childNodes.map((node, i) => (
        <HtmlNode key={i} node={node} document={document} bodyRef={bodyRef} root />
      ))}
    </div>
  );
}

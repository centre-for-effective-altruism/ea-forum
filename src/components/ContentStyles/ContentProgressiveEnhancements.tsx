import { FC, Fragment, ReactNode, useMemo } from "react";
import { parseDocument, ElementType } from "htmlparser2";
import type { ChildNode } from "domhandler";
import { captureEvent } from "@/lib/analyticsEvents";
import { translateAttribs, validateUrl } from "@/lib/utils/contentHelpers";

const HtmlNode: FC<{
  node: ChildNode,
  root?: boolean,
}> = ({ node, root }) => {
  switch (node.type) {
  case ElementType.Tag: {
    let As = node.tagName.toLowerCase() as any;
    if (As === 'html' || As === 'body' || As === 'head') {
      As = 'div';
    }

    const attribs = translateAttribs(node.attribs);
    const id = attribs.id;
    const classNames = node.attribs.class?.split(' ') ?? [];

    let mappedChildren: ReactNode[] = node.childNodes.map((c,i) => (
      <HtmlNode key={i} node={c} />
    ))

    if (classNames.includes("footnotes")) {
      /*
      return (
        <CollapsedFootnotes
          TagName={As}
          attributes={attribs}
          footnoteElements={mappedChildren}
        />
      );
       */
    }

    let result: ReactNode | ReactNode[] = mappedChildren;

    if (classNames.includes("strawpoll-embed")) {
      /*
      result = (
        <WrappedStrawPoll>
          {result}
        </WrappedStrawPoll>
      );
       */
    }

    if (classNames.includes("ck-cta-button")) {
      if (attribs['data-href']) {
        attribs.href = validateUrl(attribs['data-href'] as string);
      }
      const originalOnClick = attribs['onClick'] as Function;
      attribs['onClick'] = (ev: React.MouseEvent<HTMLAnchorElement>) => {
        captureEvent("ctaButtonClicked", {href: attribs['data-href'] as string});
        originalOnClick?.(ev);
      }
    }

    if (classNames.includes("ck-poll")) {
      /*
      const forumEventId = attribs['data-internal-id'];
      if (forumEventId) {
        return (
          <ForumEventPostPagePollSection
            id={forumEventId}
            forumEventId={forumEventId}
          />
        );
      }
       */
    }

    if (attribs['data-internal-id']) {
      // If the element has a data-internal-id attribute, translate it into `id`.
      // This is used in some ckeditor plugins (Google Docs import, ckeditor5-poll,
      // internal-block-links) to support internal linking.
      // If the element already has an ID, create a wrapper span with the added ID.
      // Otherwise add it to the element.
      // TODO: The previous implementation of this also checked the document for
      // elements with the same ID, which is not implemented here (and is complicated
      // significantly by render timings). I'm not sure whether that's actually
      // important.
      if (attribs.id) {
        result = (
          <span id={attribs['data-internal-id'] as string}>{result}</span>
        );
      } else {
        attribs.id = attribs['data-internal-id'];
      }
    }

    if (root && ['p','div','table'].includes(As)) {
      /*
      return (
        <MaybeScrollableBlock
          TagName={As}
          attribs={attribs}
          bodyRef={passedThroughProps.bodyRef}
        >
          {result}
        </MaybeScrollableBlock>
      );
       */
    } else if (As === 'a') {
      /*
      return (
        <HoverPreviewLink
          href={attribs.href}
          {...passedThroughProps}
          {...attribs}
        >
          {result}
        </HoverPreviewLink>
      );
       */
    } else if (node.childNodes.length > 0) {
      return (
        <As {...attribs}>
          {result}
        </As>
      );
    }

    return <As {...attribs} />
  }

  case ElementType.Script: {
    // Embedded script tag. This can appear in posts/etc if they were last edited
    // by an admin (otherwise the validator will have stripped it out).
    const scriptText: string = node.childNodes
      .map((c) => c.type === ElementType.Text ? c.data : "")
      .join("");
    return <script>{scriptText}</script>;
  }

  case ElementType.Style: {
    // Embedded style tag. This can appear in posts/etc if they were last edited
    // by an admin (otherwise the validator will have stripped it out). All children
    // must be text nodes.
    const styleText: string = node.childNodes
      .map((c) => c.type === ElementType.Text ? c.data : "")
      .join("");
    return <style>{styleText}</style>;
  }

  case ElementType.Text:
    return node.data;

  default:
    return null;
  }
}

export default function ContentProgressiveEnhancements({ html, className }: Readonly<{
  html: string,
  className?: string,
}>) {
  const node = useMemo(() => parseDocument(html), [html]);
  return (
    <div data-component="ContentItemBody" className={className}>
      {node.childNodes.map((node, i) => (
        <HtmlNode key={i} node={node} root />
      ))}
    </div>
  );
}

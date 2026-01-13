"server-only";

import { randomId } from "../utils/random";
import { processMathjax } from "./mathjax";
import { trimLeadingAndTrailingWhiteSpace } from "./conversionHelpers";
import MarkdownIt, { PluginSimple } from "markdown-it";
import type { StateInline } from "markdown-it/index.js";
import markdownItContainer from "markdown-it-container";
import markdownItFootnote from "markdown-it-footnote";
// @ts-expect-error This library doesn't have types
import markdownItSub from "markdown-it-sub";
// @ts-expect-error This library doesn't have types
import markdownItSup from "markdown-it-sup";
import { markdownCollapsibleSections } from "./markdownCollapsibleSections";

const math = (state: StateInline, silent: boolean) => {
  let startMathPos = state.pos;
  if (state.src.charCodeAt(startMathPos) !== 0x5c /* \ */) {
    return false;
  }
  const match = state.src
    .slice(++startMathPos)
    .match(/^(?:\\\[|\\\(|begin\{([^}]*)\})/);
  if (!match) {
    return false;
  }
  startMathPos += match[0].length;
  let type: string;
  let endMarker: string;
  let includeMarkers: boolean | undefined;
  if (match[0] === "\\[") {
    type = "display_math";
    endMarker = "\\\\]";
  } else if (match[0] === "\\(") {
    type = "inline_math";
    endMarker = "\\\\)";
  } else if (match[1]) {
    type = "math";
    endMarker = "\\end{" + match[1] + "}";
    includeMarkers = true;
  }
  const endMarkerPos = state.src.indexOf(endMarker!, startMathPos);
  if (endMarkerPos === -1) {
    return false;
  }
  const nextPos = endMarkerPos + endMarker!.length;
  if (!silent) {
    const token = state.push(type!, "", 0);
    token.content = includeMarkers
      ? state.src.slice(state.pos, nextPos)
      : state.src.slice(startMathPos, endMarkerPos);
  }
  state.pos = nextPos;
  return true;
};

const texMath = (state: StateInline, silent: boolean) => {
  let startMathPos = state.pos;
  if (state.src.charCodeAt(startMathPos) !== 0x24 /* $ */) {
    return false;
  }

  // Parse tex math according to http://pandoc.org/README.html#math
  let endMarker = "$";
  const afterStartMarker = state.src.charCodeAt(++startMathPos);
  if (afterStartMarker === 0x24 /* $ */) {
    endMarker = "$$";
    if (state.src.charCodeAt(++startMathPos) === 0x24 /* $ */) {
      // 3 markers are too much
      return false;
    }
  } else {
    // Skip if opening $ is succeeded by a space character
    if (
      afterStartMarker === 0x20 /* space */ ||
      afterStartMarker === 0x09 /* \t */ ||
      afterStartMarker === 0x0a /* \n */
    ) {
      return false;
    }
  }
  const endMarkerPos = state.src.indexOf(endMarker, startMathPos);
  if (endMarkerPos === -1) {
    return false;
  }
  if (state.src.charCodeAt(endMarkerPos - 1) === 0x5c /* \ */) {
    return false;
  }
  const nextPos = endMarkerPos + endMarker.length;
  if (endMarker.length === 1) {
    // Skip if $ is preceded by a space character
    const beforeEndMarker = state.src.charCodeAt(endMarkerPos - 1);
    if (
      beforeEndMarker === 0x20 /* space */ ||
      beforeEndMarker === 0x09 /* \t */ ||
      beforeEndMarker === 0x0a /* \n */
    ) {
      return false;
    }
    // Skip if closing $ is succeeded by a digit (eg $5 $10 ...)
    const suffix = state.src.charCodeAt(nextPos);
    if (suffix >= 0x30 && suffix < 0x3a) {
      return false;
    }
  }

  if (!silent) {
    const token = state.push(
      endMarker.length === 1 ? "inline_math" : "display_math",
      "",
      0,
    );
    token.content = state.src.slice(startMathPos, endMarkerPos);
  }
  state.pos = nextPos;
  return true;
};

const escapeHtml = (html: string) =>
  html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/\u00a0/g, " ");

const extend = <T>(options: Record<string, T>, defaults: Record<string, T>) => {
  return Object.keys(defaults).reduce(function (result, key) {
    if (result[key] === undefined) {
      result[key] = defaults[key];
    }
    return result;
  }, options);
};

const mapping: Record<string, string> = {
  math: "Math",
  inline_math: "InlineMath",
  display_math: "DisplayMath",
};

const markdownItMathjax = (options?: Record<string, string>): PluginSimple => {
  const defaults = {
    beforeMath: "",
    afterMath: "",
    beforeInlineMath: "\\(",
    afterInlineMath: "\\)",
    beforeDisplayMath: "\\[",
    afterDisplayMath: "\\]",
  };
  options = extend(options || {}, defaults);
  return (md: MarkdownIt) => {
    md.inline.ruler.before("escape", "math", math);
    md.inline.ruler.push("texMath", texMath);
    Object.keys(mapping).forEach((key) => {
      const before = options?.["before" + mapping[key]];
      const after = options?.["after" + mapping[key]];
      md.renderer.rules[key] = (tokens: { content: string }[], idx: number) => {
        return before + escapeHtml(tokens[idx].content) + after;
      };
    });
  };
};

let _mdi: MarkdownIt | null = null;
export const getMarkdownIt = () => {
  if (!_mdi) {
    const mdi = MarkdownIt({ linkify: true });
    mdi.use(markdownItMathjax());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mdi.use(markdownItContainer as any, "spoiler");
    mdi.use(markdownItFootnote);
    mdi.use(markdownItSub);
    mdi.use(markdownItSup);
    mdi.use(markdownCollapsibleSections);
    _mdi = mdi;
  }
  return _mdi;
};

const markdownToHtmlNoLaTeX = (markdown: string): string => {
  const id = randomId();
  const renderedMarkdown = getMarkdownIt().render(markdown, { docId: id });
  return trimLeadingAndTrailingWhiteSpace(renderedMarkdown);
};

export const markdownToHtml = (
  markdown: string,
  options?: {
    skipMathjax?: boolean;
  },
): Promise<string> => {
  const html = markdownToHtmlNoLaTeX(markdown);
  if (options?.skipMathjax) {
    return Promise.resolve(html);
  }
  return processMathjax(html);
};

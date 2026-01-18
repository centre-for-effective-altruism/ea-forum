"server-only";

import type { LiteElement } from "mathjax-full/js/adaptors/lite/Element";
import { mathjax } from "mathjax-full/js/mathjax";
import { TeX } from "mathjax-full/js/input/tex";
import { CHTML } from "mathjax-full/js/output/chtml";
import { LiteAdaptor, liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages";
import { captureException } from "@sentry/nextjs";

const trimLatexAndAddCss = (
  body: LiteElement,
  adaptor: LiteAdaptor,
  css: string,
) => {
  // Remove empty paragraphs
  const paragraphs = adaptor.tags(body, "mjx-container");

  // Filter to only display equations (not inline)
  for (let i = paragraphs.length - 1; i >= 0; i--) {
    const elem = paragraphs[i];
    const display = adaptor.getAttribute(elem, "display");

    // Check if it's a display equation and has no content
    if (display === "true" || display === "block") {
      const textContent = adaptor.textContent(elem);
      if (textContent.trim() === "") {
        const parent = adaptor.parent(elem);
        if (parent) {
          adaptor.remove(elem);
        }
      }
    }
  }

  // Find first LaTeX element and add CSS
  const containers = adaptor.tags(body, "mjx-container");
  const firstLatexElement = containers.length > 0 ? containers[0] : null;

  if (firstLatexElement && css) {
    const styleNode = adaptor.node("style", {}, [adaptor.text(css)]);
    adaptor.append(firstLatexElement, styleNode);
  }
};

export const processMathjax = (html: string): Promise<string> => {
  return new Promise((resolve) => {
    let finished = false;

    setTimeout(() => {
      if (!finished) {
        const errorMessage = `Timed out in mjpage when processing html: ${html}`;
        captureException(new Error(errorMessage));
        console.error(errorMessage);
        finished = true;
        resolve(html);
      }
    }, 10000);

    try {
      // Create an adaptor for working with HTML
      const adaptor = liteAdaptor();
      RegisterHTMLHandler(adaptor);

      // Create mathjax document with input and output processors
      const tex = new TeX({
        packages: AllPackages,
        inlineMath: [
          ["$", "$"],
          ["\\(", "\\)"],
        ],
        displayMath: [
          ["$$", "$$"],
          ["\\[", "\\]"],
        ],
      });
      const chtml = new CHTML({
        fontURL: "https://cdn.jsdelivr.net/npm/mathjax@3/es5/output/chtml/fonts",
      });
      const node = adaptor.parse(html);
      const mathDocument = mathjax.document(node, {
        InputJax: tex,
        OutputJax: chtml,
      });

      // Process the document
      mathDocument.render();
      const css = adaptor.textContent(chtml.styleSheet(mathDocument) as LiteElement);
      trimLatexAndAddCss(mathDocument.document.body, adaptor, css);
      const result = adaptor.innerHTML(mathDocument.document.body);
      finished = true;
      resolve(result);
    } catch (error) {
      captureException(error);
      console.error("Error in MathJax processing:", error);
      finished = true;
      resolve(html); // Return original HTML on error
    }
  });
};

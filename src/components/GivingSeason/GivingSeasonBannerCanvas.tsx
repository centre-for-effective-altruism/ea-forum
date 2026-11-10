"use client";

import { useLayoutEffect, useRef } from "react";
import {
  BannerLineColors,
  BannerLinesRenderer,
  createBannerLinesRenderer,
} from "./bannerLines";

/**
 * Draws the background lines into the parent element, flowing around the
 * text. The parent must be positioned. The lines fade in when they first appear.
 */
export default function GivingSeasonBannerCanvas({
  colors,
  text,
}: Readonly<{
  colors: BannerLineColors;
  text: HTMLElement;
}>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<BannerLinesRenderer | null>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const renderer = createBannerLinesRenderer(canvas);
    rendererRef.current = renderer;
    return () => {
      renderer?.dispose();
      rendererRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const container = canvasRef.current?.parentElement;
    if (!container) {
      return;
    }
    const draw = () => rendererRef.current?.draw({ container, text, colors });

    const observer = new ResizeObserver(draw);
    observer.observe(container);
    rendererRef.current?.draw({ container, text, colors }, { animate: true });
    if (document.fonts.status !== "loaded") {
      void document.fonts.ready.then(draw);
    }

    return () => observer.disconnect();
  }, [colors, text]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 w-full h-full block pointer-events-none animate-fade-in [animation-duration:500ms] motion-reduce:animate-none"
    />
  );
}

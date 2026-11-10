"use client";

import { useLayoutEffect, useRef } from "react";
import {
  BannerLineColors,
  BannerLinesRenderer,
  createBannerLinesRenderer,
} from "./bannerLines";

/** The lines fade in when they first appear. */
export default function GivingSeasonBannerCanvas({
  colors,
  text,
}: Readonly<{
  colors: BannerLineColors;
  text: HTMLElement;
}>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<BannerLinesRenderer | null>(null);
  const colorsRef = useRef(colors);

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
    const draw = () =>
      rendererRef.current?.draw({ container, text, colors: colorsRef.current });

    const observer = new ResizeObserver(draw);
    observer.observe(container);
    if (document.fonts.status !== "loaded") {
      void document.fonts.ready.then(draw);
    }

    return () => observer.disconnect();
  }, [text]);

  useLayoutEffect(() => {
    colorsRef.current = colors;
    const container = canvasRef.current?.parentElement;
    if (container) {
      rendererRef.current?.draw({ container, text, colors }, { animate: true });
    }
  }, [colors, text]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 w-full h-full block pointer-events-none animate-fade-in [animation-duration:500ms] motion-reduce:animate-none"
    />
  );
}

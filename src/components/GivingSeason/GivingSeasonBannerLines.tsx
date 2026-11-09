"use client";

import { ReactNode, useLayoutEffect, useRef } from "react";
import {
  BannerLineColors,
  BannerLinesRenderer,
  createBannerLinesRenderer,
} from "./bannerLines";

/**
 * Draws the background lines into the parent element, flowing around
 * `children`. The parent must be positioned.
 */
export default function GivingSeasonBannerLines({
  colors,
  className,
  children,
}: Readonly<{
  colors: BannerLineColors;
  className?: string;
  children: ReactNode;
}>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
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
    const text = textRef.current;
    if (!container || !text) {
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
  }, [colors]);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute inset-0 w-full h-full block pointer-events-none"
      />
      <div ref={textRef} className={className}>
        {children}
      </div>
    </>
  );
}

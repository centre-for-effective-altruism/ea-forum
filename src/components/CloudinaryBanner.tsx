"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import CloudinaryImage from "./CloudinaryImage";

const WIDTH_STEP = 100;
const MAX_DPR = 3;
const RESIZE_DEBOUNCE_MS = 200;

type BannerSize = {
  width: number;
  height: number;
  dpr: number;
};

const roundUpWidth = (width: number) => Math.ceil(width / WIDTH_STEP) * WIDTH_STEP;

/**
 * Fills its container with a Cloudinary image cropped to exactly the
 * container's size, so the banner isn't stretched or over-cropped. The size
 * can only be measured in the browser, so the image loads after hydration.
 */
export default function CloudinaryBanner({
  publicId,
  preCrop,
  className,
  children,
}: Readonly<{
  publicId: string;
  preCrop?: boolean;
  className?: string;
  children?: ReactNode;
}>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<BannerSize | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let measured = false;
    const updateSize = (width: number, height: number) => {
      const next = {
        width: roundUpWidth(width),
        height: Math.ceil(height),
        dpr: Math.min(window.devicePixelRatio || 1, MAX_DPR),
      };
      setSize((current) =>
        current &&
        current.dpr === next.dpr &&
        current.width >= next.width &&
        current.height >= next.height
          ? current
          : next,
      );
    };
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!measured) {
        measured = true;
        updateSize(width, height);
        return;
      }
      clearTimeout(timeout);
      timeout = setTimeout(() => updateSize(width, height), RESIZE_DEBOUNCE_MS);
    });
    observer.observe(container);
    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-component="CloudinaryBanner"
      className={className}
      aria-hidden
    >
      {size && size.width > 0 && size.height > 0 && (
        <CloudinaryImage
          publicId={publicId}
          width={size.width}
          height={size.height}
          imgProps={{ g: "custom", dpr: size.dpr.toString() }}
          preCrop={preCrop}
          loading="eager"
          wrapperClassName="block h-full"
          className="w-full! h-full! object-cover"
        />
      )}
      {children}
    </div>
  );
}

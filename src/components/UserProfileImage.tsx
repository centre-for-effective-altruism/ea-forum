"use client";

import { memo, useState } from "react";
import CloudinaryImage from "./CloudinaryImage";
import prand from "pure-rand";
import clsx from "clsx";

type UserWithProfileImage = {
  displayName: string | null;
  profileImageId?: string | null;
};

const MIN_HUE = 100;
const MAX_HUE = 360;
const MIN_SATURATION = 30;
const MAX_SATURATION = 65;
const MIN_LIGHTNESS = 38;
const MAX_LIGHTNESS = 40;

const stringHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

const userBackground = (displayName: string): string => {
  const rand = prand.congruential32(stringHash(displayName));
  const h = prand.uniformIntDistribution(MIN_HUE, MAX_HUE, rand)[0];
  const s = prand.uniformIntDistribution(MIN_SATURATION, MAX_SATURATION, rand)[0];
  const l = prand.uniformIntDistribution(MIN_LIGHTNESS, MAX_LIGHTNESS, rand)[0];
  return `hsl(${h}deg ${s}% ${l}%)`;
};

const getTextSizeMultiplier = (text: string) => {
  switch (text.length) {
    case 1:
      return 0.5;
    case 2:
      return 0.45;
    default:
      return 0.34;
  }
};

const InitialFallback = memo(function InitialFallback({
  displayName,
  size,
  className,
}: Readonly<{
  displayName: string;
  size: number;
  className?: string;
}>) {
  displayName ??= "";
  const initials = displayName
    .split(/[\s-_.()]/)
    .map((s) => s?.[0]?.toUpperCase())
    .filter((s) => s?.length && s?.match(/\p{L}/u));
  const text = initials.join("").slice(0, 3);
  const background = userBackground(displayName);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      width={`${size}px`}
      height={`${size}px`}
      viewBox={`0 0 ${size} ${size}`}
      className={clsx("select-none", className)}
    >
      <rect
        fill={background}
        width={size}
        height={size}
        cx={size / 2}
        cy={size / 2}
        r={size / 2}
      />
      <text
        className="text-always-white fill-always-white leading-none font-sans"
        x="50%"
        y="50%"
        alignmentBaseline="middle"
        textAnchor="middle"
        fontSize={size * getTextSizeMultiplier(text)}
        fontWeight="600"
        dy=".1em"
        dominantBaseline="middle"
      >
        {text}
      </text>
    </svg>
  );
});

export default function UserProfileImage({
  user,
  size,
  className = "",
}: Readonly<{
  user?: UserWithProfileImage | null;
  size: number;
  className?: string;
}>) {
  const [loaded, setLoaded] = useState(false);
  const rootClassName = clsx(
    "rounded-full",
    !loaded && "profile-image-loading",
    className,
  );
  const wrapperClassName = "flex items-center";

  if (!user?.displayName) {
    return (
      <picture className={wrapperClassName} data-component="UserProfileImage">
        <div className={rootClassName} style={{ width: size, height: size }} />
      </picture>
    );
  }

  if (user.profileImageId) {
    return (
      <CloudinaryImage
        width={size}
        height={size}
        imgProps={{ q: "100", dpr: "2" }}
        publicId={user.profileImageId}
        alt={user.displayName}
        onLoaded={() => setLoaded(true)}
        className={clsx(rootClassName, "text-[0px]")}
        wrapperClassName={wrapperClassName}
        data-component="UserProfileImage"
      />
    );
  }

  return (
    <picture className={wrapperClassName} data-component="UserProfileImage">
      <InitialFallback
        displayName={user.displayName}
        size={size}
        className={rootClassName}
      />
    </picture>
  );
}

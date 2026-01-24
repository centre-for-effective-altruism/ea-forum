"use client";

import Script from "next/script";
import { usePostDisplay } from "./usePostDisplay";
import { isPostAllowedType3Audio } from "@/lib/posts/postAudio";

export default function PostAudioPlayer({
  className,
}: Readonly<{
  className?: string;
}>) {
  const { post, showAudio } = usePostDisplay();
  if (!showAudio) {
    return null;
  }

  if (post.podcastEpisode) {
    return <div data-component="PostAudioPlayer" className={className}></div>;
  }

  if (isPostAllowedType3Audio(post)) {
    return (
      <div data-component="PostAudioPlayer" className={className}>
        <Script
          src="https://embed.type3.audio/player.js"
          crossOrigin="anonymous"
          type="module"
          defer
        />
        {/* @ts-expect-error This is a custom DOM node */}
        <type-3-player
          analytics="custom"
          sticky="true"
          header-play-buttons="true"
          title=""
        />
      </div>
    );
  }

  return null;
}

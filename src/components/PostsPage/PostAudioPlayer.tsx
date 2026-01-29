"use client";

import Script from "next/script";
import { usePostDisplay } from "./usePostDisplay";
import { isPostAllowedType3Audio } from "@/lib/posts/postAudio";
import ApplePodcastIcon from "../Icons/ApplePodcastIcon";
import SpotifyPodcastIcon from "../Icons/SpotifyPodcastIcon";
import Link from "../Link";

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
    return (
      <div data-component="PostAudioPlayer" className={className}>
        <Script src={post.podcastEpisode.episodeLink} async />
        <div
          id={`buzzsprout-player-${post.podcastEpisode.externalEpisodeId}`}
          className="opacity-(--buzzsprout-opacity)"
        />
        <div className="flex flex-row items-center gap-2">
          {post.podcastEpisode.podcast?.applePodcastLink && (
            <Link
              href={post.podcastEpisode.podcast?.applePodcastLink}
              openInNewTab
              className="mt-2 hover:opacity-60"
            >
              <ApplePodcastIcon />
            </Link>
          )}
          {post.podcastEpisode.podcast?.spotifyPodcastLink && (
            <Link
              href={post.podcastEpisode.podcast?.spotifyPodcastLink}
              openInNewTab
              className="mt-2 hover:opacity-60"
            >
              <SpotifyPodcastIcon />
            </Link>
          )}
        </div>
      </div>
    );
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

"use client";

import { usePostDisplay } from "./usePostDisplay";
import { postHasAudio } from "@/lib/posts/postAudio";
import clsx from "clsx";
import SpeakerWaveIcon from "@heroicons/react/24/outline/SpeakerWaveIcon";
import Tooltip from "../Tooltip";
import Type from "../Type";

export default function PostAudioToggle() {
  const { post, showAudio, toggleShowAudio } = usePostDisplay();
  if (!postHasAudio(post)) {
    return null;
  }
  return (
    <Tooltip title={<Type style="bodySmall">Listen to this post</Type>} offsetPx={8}>
      <button
        data-component="PostAudioToggle"
        aria-label="Listen to this post"
        onClick={toggleShowAudio}
        className={clsx(
          "flex items-center justify-center cursor-pointer text-gray-600",
          "rounded p-1.5 hover:bg-gray-200 hover:text-gray-800",
          showAudio && "bg-gray-200",
        )}
      >
        <SpeakerWaveIcon className="w-5" />
      </button>
    </Tooltip>
  );
}

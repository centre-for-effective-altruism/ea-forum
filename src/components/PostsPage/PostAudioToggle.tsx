"use client";

import { usePostDisplay } from "./usePostDisplay";
import { postHasAudio } from "@/lib/posts/postAudio";
import SpeakerWaveIcon from "@heroicons/react/24/outline/SpeakerWaveIcon";
import Tooltip from "../Tooltip";
import Type from "../Type";

export default function PostAudioToggle() {
  const { post, showAudio, toggleShowAudio } = usePostDisplay();
  if (!postHasAudio(post)) {
    return null;
  }
  return (
    <Tooltip title={<Type style="bodySmall">Listen to this post</Type>}>
      <button
        data-component="PostAudioToggle"
        aria-label="Listen to this post"
        onClick={toggleShowAudio}
        className="
          flex items-center justify-center cursor-pointer relative
          text-gray-600 hover:text-gray-1000
        "
      >
        {showAudio && (
          <div
            className="
              absolute -top-1 -left-1 w-[28px] h-[28px] bg-gray-200 z-1 rounded-[2px]
            "
          />
        )}
        <SpeakerWaveIcon className="w-5 z-2 relative" />
      </button>
    </Tooltip>
  );
}

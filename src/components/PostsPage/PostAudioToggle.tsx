"use client";

import { usePostDisplay } from "./usePostDisplay";
import { postHasAudio } from "@/lib/posts/postAudio";
import SpeakerWaveIcon from "@heroicons/react/24/outline/SpeakerWaveIcon";
import Tooltip from "../Tooltip";
import Type from "../Type";
import clsx from "clsx";

export default function PostAudioToggle() {
  const { post, showAudio, toggleShowAudio } = usePostDisplay();
  if (!postHasAudio(post)) {
    return null;
  }
  return (
    <Tooltip title={<Type style="bodySmall">Listen to this post</Type>}>
      <button
        data-component="PostAudioToggle"
        onClick={toggleShowAudio}
        className={clsx(
          "flex items-center justify-center cursor-pointer rounded-[2px]",
          "text-gray-600 hover:text-gray-1000 p-1",
          showAudio && "bg-gray-200",
        )}
      >
        <SpeakerWaveIcon className="w-5" />
      </button>
    </Tooltip>
  );
}

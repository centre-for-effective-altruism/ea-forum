"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { captureException } from "@sentry/nextjs";
import AddEmojiIcon from "../Icons/AddEmojiIcon";
import ControlledTooltip from "../ControlledTooltip";

/** Hack: Inlined styling for the emoji-picker shadow DOM */
const pickerStyles = `
  input.search {
    font-family: "Inter", sans-serif;
    border-radius: 4px;
    padding: 3px 5px;
    border-color: #ddd;
  }
  @media (prefers-color-scheme: dark) {
    input.search {
      border-color: #444;
    }
  }
`

export default function ForumEventEmojiPicker({ onSelect }: Readonly<{
  onSelect: (value: string) => void,
}>) {
  const [openPicker, setOpenPicker] = useState(false);
  const [emoji, setEmoji] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Lazy-load the Web Component (it causes an error if imported on the server)
    import("emoji-picker-element").catch((err) => {
      console.error("Failed to load emoji-picker-element:", err);
      captureException(err);
    });
  }, []);

  const toggleOpen = useCallback(() => setOpenPicker((open) => !open), []);

  const handleEmojiClick = useCallback((emoji: string) => {
    setEmoji(emoji);
    onSelect(emoji);
    setOpenPicker(false);
  }, [onSelect]);

  const handleEmojiPickerSelect = useCallback((event: CustomEvent) => {
    const { emoji } = event.detail;
    if (emoji?.unicode) {
      handleEmojiClick(emoji.unicode);
    }
  }, [handleEmojiClick]);

  /**
   * Inject custom CSS into the <emoji-picker> shadow root.
   */
  const handlePickerRef = useCallback((elem: HTMLElement | null) => {
    if (elem) {
      const styleId = "forum-emoji-picker-styles";
      const alreadyHasStyle = elem.shadowRoot?.getElementById(styleId);

      if (!alreadyHasStyle) {
        const styleEl = document.createElement("style");
        styleEl.id = styleId;
        styleEl.textContent = pickerStyles;
        elem.shadowRoot?.appendChild(styleEl);
      }

      elem.addEventListener("emoji-click", handleEmojiPickerSelect as EventListener);
    }
  }, [handleEmojiPickerSelect]);

  return (
    <ControlledTooltip
      As="span"
      isOpen={openPicker}
      setIsOpen={setOpenPicker}
      tooltipClassName="p-0!"
      interactable
      noHover
      title={
        <div ref={pickerRef}>
          {/* @ts-expect-error This element doesn't have types */}
          <emoji-picker ref={handlePickerRef} />
        </div>
      }
    >
      <button
        data-component="ForumEventEmojiPicker"
        onClick={toggleOpen}
        className="flex items-center text-[24px] hover:bg-white/5"
      >
        <div
          className="
            flex justify-center items-center cursor-pointer user-select-none
            w-10 h-10 rounded border-1 border-gray-400
          "
        >
          {emoji
            ? <span className="font-[26px] mt-[3px]">{emoji}</span>
            : <AddEmojiIcon className="text-gray-500 ml-[2px]" />
          }
        </div>
      </button>
    </ControlledTooltip>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useEAForumV3 } from "@/lib/hooks/useEAForumV3";

function ToggleSwitch({
  value,
  onChange,
}: Readonly<{
  value: boolean;
  onChange: (value: boolean) => void;
}>) {
  const onClick = useCallback(() => {
    onChange(!value);
  }, [value, onChange]);

  return (
    <button
      onClick={onClick}
      className={`
        relative w-[28px] h-[16px] rounded-full cursor-pointer transition-colors
        ${value ? "bg-primary" : "bg-gray-400"}
      `}
    >
      <div
        className={`
          absolute top-[2px] w-[12px] h-[12px] rounded-full bg-white transition-all
          ${value ? "left-[14px]" : "left-[2px]"}
        `}
      />
    </button>
  );
}

export default function SiteToggle() {
  const [mounted, setMounted] = useState(false);
  const { preferNewSite, setPreferNewSite } = useEAForumV3();

  // Only render after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      data-component="SiteToggle"
      className="fixed left-5 bottom-5 z-[1000] bg-white/80 rounded-lg shadow-md p-3 flex flex-col gap-2.5 font-sans text-[13px] max-sm:hidden print:hidden"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-gray-900">Prefer new site</span>
        <ToggleSwitch value={preferNewSite} onChange={setPreferNewSite} />
      </div>
    </div>,
    document.body,
  );
}

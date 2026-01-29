"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useEAForumV3 } from "@/lib/hooks/useEAForumV3";
import { useAdminToggle } from "@/lib/hooks/useAdminToggle";
import ToggleSwitch from "../Forms/ToggleSwitch";

export default function SiteToggle() {
  const [mounted, setMounted] = useState(false);
  const { preferNewSite, setPreferNewSite } = useEAForumV3();
  const { showAdminToggle, isAdmin, setAdmin } = useAdminToggle();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      data-component="SiteToggle"
      className="
        fixed left-5 bottom-5 z-[1000] bg-gray-0/80 rounded-lg shadow-md p-3
        flex flex-col gap-2.5 font-sans text-[13px] max-sm:hidden print:hidden
      "
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-gray-900">Prefer new site</span>
        <ToggleSwitch value={preferNewSite} onChange={setPreferNewSite} />
      </div>
      {showAdminToggle && (
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-gray-900">
            Admin {isAdmin ? "on" : "off"}
          </span>
          <ToggleSwitch value={isAdmin} onChange={setAdmin} />
        </div>
      )}
    </div>,
    document.body,
  );
}

"use client";

import { useState } from "react";
import TextLinkButton from "../TextLinkButton";
import ReportPopover from "../Moderation/ReportPopover";

export default function ReportUserButton({
  slug,
}: Readonly<{
  slug: string;
}>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TextLinkButton variant="primary" onClick={() => setOpen(true)}>
        Report user
      </TextLinkButton>
      <ReportPopover userSlug={slug} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

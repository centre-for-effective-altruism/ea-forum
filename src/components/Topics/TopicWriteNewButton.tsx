"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import QuickTakePopover from "../QuickTakes/QuickTakePopover";
import type { DropdownDismissRef } from "../Dropdown/Dropdown";
import DropdownMenu from "../Dropdown/DropdownMenu";
import Button from "../Button";

export default function TopicWriteNewButton({
  tag,
}: Readonly<{
  tag: { _id: string };
}>) {
  const { currentUser } = useCurrentUser();
  const { onLogin } = useLoginPopoverContext();
  const dismissRef: DropdownDismissRef = useRef(null);
  const [quickTakeOpen, setQuickTakeOpen] = useState(false);
  const onOpenQuickTake = useCallback(() => {
    dismissRef.current?.();
    setQuickTakeOpen(true);
  }, []);
  const onCloseQuickTake = useCallback(() => setQuickTakeOpen(false), []);
  const initialTagIds = useMemo(() => [tag._id], [tag._id]);

  const button = (
    <Button
      variant="greyFilled"
      onClick={currentUser ? undefined : onLogin}
      eventProps={{ buttonName: "topicWriteNew" }}
      className="flex items-center gap-1"
    >
      <PlusIcon className="w-4" />
      Write new
    </Button>
  );

  if (!currentUser) {
    return button;
  }

  return (
    <>
      <DropdownMenu
        placement="bottom-end"
        pageElementContext="topicWriteNew"
        dismissRef={dismissRef}
        items={[
          { title: "New post", href: `/newPost?tagId=${tag._id}` },
          {
            title: "New question",
            href: `/newPost?question=true&tagId=${tag._id}`,
          },
          { title: "New quick take", onClick: onOpenQuickTake },
        ]}
      >
        {button}
      </DropdownMenu>
      {quickTakeOpen && (
        <QuickTakePopover
          open
          onClose={onCloseQuickTake}
          initialTagIds={initialTagIds}
        />
      )}
    </>
  );
}

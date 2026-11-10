"use client";

import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import Button from "../Button";

export default function NewQuestionButton() {
  const { currentUser } = useCurrentUser();
  const { onLogin } = useLoginPopoverContext();
  return (
    <Button
      variant="greyFilled"
      href={currentUser ? "/newPost?question=true" : undefined}
      onClick={currentUser ? undefined : onLogin}
      eventProps={{ buttonName: "newQuestion" }}
      className="flex items-center gap-1"
    >
      <PlusIcon className="w-4" />
      New question
    </Button>
  );
}

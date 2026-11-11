"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { captureException } from "@sentry/nextjs";
import toast from "react-hot-toast";
import { rpc } from "@/lib/rpc";
import { errorMessage } from "./sequenceEditFormHelpers";
import Popover from "../Popover";
import Button from "../Button";
import Type from "../Type";

const dangerClassName = "text-error border-error!";

export default function DeleteSequenceSection({
  sequenceId,
}: Readonly<{
  sequenceId: string;
}>) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const eventProps = { sequenceId };

  const onOpen = useCallback(() => setConfirming(true), []);
  const onClose = useCallback(() => {
    if (!deleting) {
      setConfirming(false);
    }
  }, [deleting]);

  const onDelete = async () => {
    setDeleting(true);
    try {
      await rpc.sequences.edit({ sequenceId, data: { isDeleted: true } });
      router.push("/library");
    } catch (e) {
      console.error(e);
      captureException(e);
      toast.error(<Type>{errorMessage(e)}</Type>);
      setDeleting(false);
    }
  };

  return (
    <section
      data-component="DeleteSequenceSection"
      className="
        flex flex-col gap-3 rounded border border-gray-200 bg-gray-0 p-4 sm:p-6
      "
    >
      <Type style="bodyHeavy" className="text-gray-1000">
        Delete sequence
      </Type>
      <Type style="bodySmall" className="text-gray-600">
        Deleting a sequence removes it from the site. Its posts are not deleted.
      </Type>
      <div>
        <Button
          variant="greyOutlined"
          onClick={onOpen}
          eventProps={{ ...eventProps, action: "openDeleteSequence" }}
          className={dangerClassName}
        >
          Delete sequence
        </Button>
      </div>
      <Popover
        open={confirming}
        onClose={onClose}
        className="flex flex-col gap-4 max-w-[400px]"
      >
        <Type style="sectionTitleLarge">Delete this sequence?</Type>
        <Type style="bodyMedium" className="text-gray-600">
          The sequence will no longer be visible. Its posts will not be deleted.
        </Type>
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="greyFilled"
            onClick={onClose}
            disabled={deleting}
            eventProps={{ ...eventProps, action: "cancelDeleteSequence" }}
          >
            Cancel
          </Button>
          <Button
            variant="greyOutlined"
            onClick={onDelete}
            disabled={deleting}
            loading={deleting}
            eventProps={{ ...eventProps, action: "deleteSequence" }}
            className={dangerClassName}
          >
            Delete
          </Button>
        </div>
      </Popover>
    </section>
  );
}

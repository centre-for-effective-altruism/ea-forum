"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { captureException } from "@sentry/nextjs";
import toast from "react-hot-toast";
import { rpc } from "@/lib/rpc";
import type { SequenceEditPageData } from "@/lib/sequences/sequenceQueries";
import { errorMessage } from "./sequenceEditFormHelpers";
import ChapterEditForm from "./ChapterEditForm";
import Button from "../Button";
import Type from "../Type";

export default function ChaptersEditor({
  sequenceId,
  chapters,
  canEditAdminFields,
}: Readonly<{
  sequenceId: string;
  chapters: SequenceEditPageData["chapters"];
  canEditAdminFields: boolean;
}>) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  const onAddChapter = async () => {
    setAdding(true);
    try {
      await rpc.chapters.create({ sequenceId, data: {} });
      toast.success(<Type>Chapter added</Type>);
      router.refresh();
    } catch (e) {
      console.error(e);
      captureException(e);
      toast.error(<Type>{errorMessage(e)}</Type>);
    }
    setAdding(false);
  };

  return (
    <div data-component="ChaptersEditor" className="flex flex-col gap-4">
      <Type style="sectionTitleLarge" className="text-gray-1000 mt-4">
        Chapters
      </Type>
      {chapters.length === 0 && (
        <Type style="bodySmall" className="text-gray-600">
          This sequence has no chapters yet.
        </Type>
      )}
      {chapters.map((chapter, index) => (
        <ChapterEditForm
          key={chapter._id}
          chapter={chapter}
          index={index}
          canEditAdminFields={canEditAdminFields}
        />
      ))}
      <div>
        <Button
          variant="greyFilled"
          onClick={onAddChapter}
          disabled={adding}
          loading={adding}
          eventProps={{ sequenceId, action: "addChapter" }}
        >
          Add chapter
        </Button>
      </div>
    </div>
  );
}

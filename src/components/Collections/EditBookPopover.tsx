"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { captureException } from "@sentry/nextjs";
import { rpc } from "@/lib/rpc";
import toast from "react-hot-toast";
import isEqual from "lodash/isEqual";
import type { HandbookEditData } from "@/lib/collections/handbookQueries";
import type { EditorContents } from "@/lib/ckeditor/editorHelpers";
import SortableSequenceList from "./SortableSequenceList";
import EditorInput from "../Forms/EditorInput";
import Input from "../Forms/Input";
import Popover from "../Popover";
import Button from "../Button";
import Type from "../Type";

const blankContents: EditorContents = { type: "ckEditorMarkup", data: "" };

export default function EditBookPopover({
  book,
  onClose,
}: Readonly<{
  book: NonNullable<HandbookEditData["book"]>;
  onClose: () => void;
}>) {
  const router = useRouter();
  const initialDescription = book.originalContents ?? blankContents;
  const [title, setTitle] = useState(book.title ?? "");
  const [description, setDescription] = useState<EditorContents>(initialDescription);
  const [sequences, setSequences] = useState(book.sequences);
  const [saving, setSaving] = useState(false);

  const sequenceIds = sequences.map(({ _id }) => _id);
  const titleChanged = title !== (book.title ?? "");
  const descriptionChanged =
    description.type !== initialDescription.type ||
    description.data !== initialDescription.data;
  const sequencesChanged = !isEqual(sequenceIds, book.sequenceIds);
  const hasChanges = titleChanged || descriptionChanged || sequencesChanged;

  const onCancel = useCallback(() => {
    if (!saving) {
      onClose();
    }
  }, [saving, onClose]);

  const onSave = async () => {
    if (!hasChanges || saving) {
      return;
    }
    setSaving(true);
    const toastId = toast.loading(<Type>Saving...</Type>);
    try {
      await rpc.books.edit({
        bookId: book._id,
        data: {
          ...(titleChanged ? { title } : null),
          ...(descriptionChanged
            ? {
                description: description.data.length
                  ? {
                      originalContents: description,
                      updateType: "patch",
                      commitMessage: "",
                    }
                  : null,
              }
            : null),
          ...(sequencesChanged ? { sequenceIds } : null),
        },
      });
      router.refresh();
      onClose();
    } catch (e) {
      console.error(e);
      captureException(e);
      toast.error(
        <Type>{e instanceof Error ? e.message : "Something went wrong"}</Type>,
      );
    }
    toast.dismiss(toastId);
    setSaving(false);
  };

  return (
    <Popover open onClose={onCancel} noCloseOnOutsideClick>
      <div
        data-component="EditBookPopover"
        className="w-[720px] max-w-full flex flex-col gap-4"
      >
        <Type style="sectionTitleLarge">Edit book</Type>
        <Input value={title} setValue={setTitle} label="Title" />
        <EditorInput
          value={description}
          setValue={setDescription}
          collectionName="Books"
          fieldName="contents"
          label="Description"
          placeholder="Edit book description"
        />
        <SortableSequenceList sequences={sequences} onChange={setSequences} />
        <div className="flex items-center justify-end gap-2 mt-4">
          <Button variant="greyFilled" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primaryFilled"
            onClick={onSave}
            disabled={!hasChanges || saving}
            loading={saving}
          >
            Save
          </Button>
        </div>
      </div>
    </Popover>
  );
}

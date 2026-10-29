"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { captureException } from "@sentry/nextjs";
import { rpc } from "@/lib/rpc";
import toast from "react-hot-toast";
import type { HandbookEditData } from "@/lib/collections/handbookQueries";
import type { EditorContents } from "@/lib/ckeditor/editorHelpers";
import ImageUpload from "../Forms/ImageUpload";
import EditorInput from "../Forms/EditorInput";
import Input from "../Forms/Input";
import Popover from "../Popover";
import Button from "../Button";
import Type from "../Type";

const blankContents: EditorContents = { type: "ckEditorMarkup", data: "" };

export default function EditCollectionPopover({
  collection,
  onClose,
}: Readonly<{
  collection: HandbookEditData["collection"];
  onClose: () => void;
}>) {
  const router = useRouter();
  const initialDescription = collection.originalContents ?? blankContents;
  const [title, setTitle] = useState(collection.title);
  const [description, setDescription] = useState<EditorContents>(initialDescription);
  const [gridImageId, setGridImageId] = useState<string | null>(
    collection.gridImageId,
  );
  const [saving, setSaving] = useState(false);

  const titleChanged = title !== collection.title;
  const descriptionChanged =
    description.type !== initialDescription.type ||
    description.data !== initialDescription.data;
  const gridImageChanged = gridImageId !== collection.gridImageId;
  const hasChanges = titleChanged || descriptionChanged || gridImageChanged;

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
      await rpc.collections.edit({
        collectionId: collection._id,
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
          ...(gridImageChanged ? { gridImageId } : null),
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
        data-component="EditCollectionPopover"
        className="w-[720px] max-w-full flex flex-col gap-4"
      >
        <Type style="sectionTitleLarge">Edit collection</Type>
        <Input value={title} setValue={setTitle} label="Title" />
        <EditorInput
          value={description}
          setValue={setDescription}
          collectionName="Collections"
          fieldName="contents"
          label="Description"
          placeholder="Edit collection description"
        />
        <ImageUpload
          value={gridImageId}
          setValue={setGridImageId}
          imageType="gridImageId"
          label="Social preview image"
        />
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

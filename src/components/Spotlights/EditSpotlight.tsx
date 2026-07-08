"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { captureException } from "@sentry/nextjs";
import { rpc } from "@/lib/rpc";
import toast from "react-hot-toast";
import type { SpotlightEdit } from "@/lib/spotlights/spotlightQueries";
import type { EditorContents } from "@/lib/ckeditor/editorHelpers";
import DocumentSelect from "../Forms/DocumentSelect";
import ImageUpload from "../Forms/ImageUpload";
import EditorInput from "../Forms/EditorInput";
import ColorPicker from "../Forms/ColorPicker";
import DatePicker from "../Forms/DatePicker";
import Select from "../Forms/Select";
import Input from "../Forms/Input";
import Button from "../Button";
import Type from "../Type";
import Link from "../Link";

export default function EditSpotlight({
  spotlight,
}: Readonly<{
  spotlight: SpotlightEdit;
}>) {
  const router = useRouter();

  const [title, setTitle] = useState(spotlight.title ?? "");
  const [documentType, setDocumentType] = useState<"Post" | "Sequence">(
    (spotlight.documentType as "Post" | "Sequence") ?? "Post",
  );
  const [documentId, setDocumentId] = useState<string>(spotlight.documentId);
  const [description, setDescription] = useState<EditorContents>(
    spotlight.description?.originalContents ?? { type: "ckEditorMarkup", data: "" },
  );
  const [imageFadeColor, setImageFadeColor] = useState<string | null>(
    spotlight.imageFadeColor,
  );
  const [imageId, setImageId] = useState<string | null>(spotlight.imageId);
  const [startAt, setStartAt] = useState<Date | null>(
    spotlight.startAt ? new Date(spotlight.startAt) : null,
  );
  const [endAt, setEndAt] = useState<Date | null>(
    spotlight.endAt ? new Date(spotlight.endAt) : null,
  );

  const onSetDocumentType = useCallback((documentType: "Post" | "Sequence") => {
    setDocumentType(documentType);
    setDocumentId("");
  }, []);

  const onSave = async () => {
    const toastId = toast.loading("Saving...");
    try {
      await rpc.spotlights.edit({
        spotlightId: spotlight._id,
        data: {
          title,
          documentType,
          documentId,
          description: description.data.length
            ? {
                originalContents: description,
                updateType: "patch",
                commitMessage: "",
              }
            : null,
          imageFadeColor,
          imageId,
          startAt,
          endAt,
        },
      });
      router.push("/admin/spotlights");
    } catch (e) {
      console.error(e);
      captureException(e);
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
    toast.dismiss(toastId);
  };

  return (
    <form data-component="EditSpotlight" className="flex flex-col gap-4">
      <Type style="sectionTitleLarge">Edit spotlight</Type>
      <Input value={title} setValue={setTitle} label="Title" />
      <div className="flex items-center gap-4 [&>*]:grow [&>*]:basis-0">
        <Select
          value={documentType}
          setValue={onSetDocumentType}
          label="Document type"
          options={[
            { label: "Post", value: "Post" },
            { label: "Sequence", value: "Sequence" },
          ]}
        />
        <DocumentSelect
          value={documentId ?? ""}
          setValue={setDocumentId}
          label={documentType}
          index={documentType === "Post" ? "posts" : "sequences"}
        />
      </div>
      <Type style="bodyHeavy" className="text-right">
        {documentId ? (
          <Link
            href={`/${documentType === "Post" ? "posts" : "s"}/${documentId}`}
            className="text-primary-dark hover:text-primary"
            openInNewTab
          >
            View selected {documentType.toLowerCase()}
          </Link>
        ) : (
          `No ${documentType.toLowerCase()} selected`
        )}
      </Type>
      <EditorInput
        value={description}
        setValue={setDescription}
        collectionName="Spotlights"
        fieldName="description"
        label="Description"
        placeholder="Edit spotlight description"
      />
      <ImageUpload
        value={imageId}
        setValue={setImageId}
        imageType="spotlightImageId"
        label="Background image"
      />
      <ColorPicker
        value={imageFadeColor}
        setValue={setImageFadeColor}
        clearable
        label="Image fade color"
      />
      <div className="flex items-center gap-4">
        <DatePicker
          value={startAt}
          setValue={setStartAt}
          clearable
          label="Start at"
          dateFormat="yyyy-MM-dd HH:mm"
          showTimeInput
        />
        <DatePicker
          value={endAt}
          setValue={setEndAt}
          clearable
          label="End at"
          dateFormat="yyyy-MM-dd HH:mm"
          showTimeInput
        />
      </div>
      <div className="flex items-center justify-end gap-2 mt-4">
        <Button variant="greyFilled" href="/admin/spotlights">
          Cancel
        </Button>
        <Button variant="primaryFilled" onClick={onSave}>
          Save
        </Button>
      </div>
    </form>
  );
}

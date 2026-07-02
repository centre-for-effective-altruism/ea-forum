"use client";

import { ChangeEvent, useCallback, useRef, useState } from "react";
import { captureException } from "@sentry/nextjs";
import toast from "react-hot-toast";
import { rpc } from "@/lib/rpc";
import {
  EditorAPI,
  EditorContents,
  getBlankEditorContents,
  isBlank,
} from "@/lib/ckeditor/editorHelpers";
import type {
  SpotlightDocumentType,
  SpotlightInput,
} from "@/lib/spotlights/spotlightHelpers";
import type { AdminSpotlight } from "@/lib/spotlights/spotlightQueries";
import type { EditorOnChangeProps } from "@/components/Editor/Editor";
import Editor from "@/components/Editor/Editor";
import CloudinaryImage from "@/components/CloudinaryImage";
import Button from "@/components/Button";
import Type from "@/components/Type";
import Input from "@/components/Forms/Input";
import Select from "@/components/Forms/Select";
import ToggleSwitch from "@/components/Forms/ToggleSwitch";
import DatePicker from "@/components/Forms/DatePicker";
import ColorInput from "@/components/Forms/ColorInput";
import FormLabel from "@/components/Forms/FormLabel";
import DocumentSelect, { SelectedDocument } from "./DocumentSelect";

const DEFAULT_BLOCK_COLOR = "#0c869b";

/**
 * Create/edit form for a spotlight. The background image is required: the
 * form cannot be submitted until one has been uploaded.
 */
export default function SpotlightForm({
  spotlight,
  onSaved,
  onCancel,
}: Readonly<{
  /** When set, the form edits this spotlight; otherwise it creates a new one */
  spotlight?: AdminSpotlight;
  onSaved: () => void;
  onCancel: () => void;
}>) {
  const [documentType, setDocumentType] = useState<SpotlightDocumentType>(
    spotlight?.documentType ?? "Post",
  );
  const [document, setDocument] = useState<SelectedDocument | null>(
    spotlight
      ? {
          _id: spotlight.documentId,
          title: spotlight.documentTitle ?? "Unknown document",
        }
      : null,
  );
  const [title, setTitle] = useState(spotlight?.title ?? "");
  const [contents, setContents] = useState<EditorContents>(
    spotlight?.descriptionContents ?? getBlankEditorContents("ckEditorMarkup"),
  );
  const [imageId, setImageId] = useState(spotlight?.display?.imageId ?? "");
  const [imageUploading, setImageUploading] = useState(false);
  const [blockColor, setBlockColor] = useState(
    spotlight?.display?.blockColor ?? DEFAULT_BLOCK_COLOR,
  );
  const [showBlockColor, setShowBlockColor] = useState(
    spotlight?.display?.showBlockColor ?? true,
  );
  const [startAt, setStartAt] = useState<Date | null>(
    spotlight ? new Date(spotlight.startAt) : null,
  );
  const [endAt, setEndAt] = useState<Date | null>(
    spotlight ? new Date(spotlight.endAt) : null,
  );
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<EditorAPI>(null);

  const onEditorChange = useCallback(({ contents }: EditorOnChangeProps) => {
    setContents(contents);
  }, []);

  const onSelectDocument = useCallback((selected: SelectedDocument) => {
    setDocument(selected);
  }, []);

  const onChangeDocumentType = useCallback((newType: SpotlightDocumentType) => {
    setDocumentType(newType);
    setDocument(null);
  }, []);

  const onImageChange = useCallback((ev: ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) {
      return;
    }
    setImageUploading(true);
    const reader = new FileReader();
    reader.onerror = () => {
      setImageUploading(false);
      toast.error("Couldn't read the image file");
    };
    reader.onload = async () => {
      try {
        const publicId = await rpc.spotlights.uploadImage({
          dataUri: reader.result as string,
        });
        setImageId(publicId);
      } catch (e) {
        captureException(e);
        toast.error("Image upload failed");
      } finally {
        setImageUploading(false);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const canSubmit =
    !!document &&
    !!title.trim() &&
    !!imageId &&
    !imageUploading &&
    !!startAt &&
    !!endAt &&
    startAt < endAt &&
    !saving;

  const onSubmit = useCallback(async () => {
    if (!canSubmit || !document || !startAt || !endAt) {
      return;
    }
    setSaving(true);
    try {
      const description = await editorRef.current?.getSubmitData();
      const input: SpotlightInput = {
        documentType,
        documentId: document._id,
        title: title.trim(),
        description:
          description && !isBlank(description.originalContents)
            ? description
            : undefined,
        imageId,
        blockColor,
        showBlockColor,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      };
      const action: Promise<unknown> = spotlight
        ? rpc.spotlights.update({ _id: spotlight._id, data: input })
        : rpc.spotlights.create(input);
      await toast.promise(action, {
        loading: <Type>Saving spotlight...</Type>,
        success: <Type>Spotlight saved</Type>,
        error: <Type>Something went wrong</Type>,
      });
      onSaved();
    } catch (e) {
      captureException(e);
    } finally {
      setSaving(false);
    }
  }, [
    canSubmit,
    document,
    documentType,
    title,
    imageId,
    blockColor,
    showBlockColor,
    startAt,
    endAt,
    spotlight,
    onSaved,
  ]);

  return (
    <div
      data-component="SpotlightForm"
      className="flex flex-col gap-4 rounded border border-gray-200 bg-gray-0 p-4"
    >
      <Type style="bodyXHeavy">
        {spotlight ? "Edit spotlight" : "New spotlight"}
      </Type>
      <div className="flex flex-wrap items-end gap-4">
        <Select
          label="Document type"
          value={documentType}
          setValue={onChangeDocumentType}
          options={[
            { label: "Post", value: "Post" },
            { label: "Sequence", value: "Sequence" },
          ]}
          className="w-40"
        />
        <div>
          <FormLabel className="mb-1 block text-[12px]!">Document</FormLabel>
          <DocumentSelect
            documentType={documentType}
            onSelect={onSelectDocument}
            placement="bottom-start"
          >
            <Button variant="greyOutlined">
              {document
                ? document.title
                : `Choose a ${documentType.toLowerCase()}...`}
            </Button>
          </DocumentSelect>
        </div>
      </div>
      <Input
        label="Title"
        value={title}
        setValue={setTitle}
        placeholder="Spotlight title"
      />
      <div>
        <FormLabel className="mb-1 block text-[12px]!">Description</FormLabel>
        <Editor
          formType={spotlight ? "edit" : "new"}
          collectionName="Spotlights"
          fieldName="description"
          placeholder="A short description. You can add links."
          value={contents}
          onChange={onEditorChange}
          commentStyles
          commentEditor
          hideControls
          ref={editorRef}
          className="w-full rounded border border-gray-300 p-2"
        />
      </div>
      <div>
        <FormLabel required className="mb-1 block text-[12px]!">
          Background image
        </FormLabel>
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept="image/*"
            onChange={onImageChange}
            disabled={imageUploading}
            className="
              font-sans text-sm text-gray-900 file:mr-3 file:cursor-pointer
              file:rounded file:border-0 file:bg-gray-300 file:px-3 file:py-2
              file:font-sans file:text-sm hover:file:bg-gray-400
            "
          />
          {imageUploading && (
            <Type style="bodySmall" className="text-gray-600">
              Uploading...
            </Type>
          )}
          {imageId && !imageUploading && (
            <CloudinaryImage
              publicId={imageId}
              height={48}
              objectFit="cover"
              className="rounded"
            />
          )}
        </div>
        {!imageId && (
          <Type style="bodySmall" className="mt-1 text-error">
            An image is required before the spotlight can be saved
          </Type>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <ColorInput
          label="Block colour"
          value={blockColor}
          setValue={setBlockColor}
        />
        <div>
          <FormLabel className="mb-1 block text-[12px]!">
            Show block colour
          </FormLabel>
          <ToggleSwitch value={showBlockColor} setValue={setShowBlockColor} />
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <DatePicker
          label="Start date & time"
          value={startAt}
          setValue={setStartAt}
          showTimeSelect
          clearable
          className="max-w-60"
        />
        <DatePicker
          label="End date & time"
          value={endAt}
          setValue={setEndAt}
          showTimeSelect
          clearable
          className="max-w-60"
        />
      </div>
      {startAt && endAt && startAt >= endAt && (
        <Type style="bodySmall" className="text-error">
          The start date must be before the end date
        </Type>
      )}
      <div className="flex items-center justify-end gap-2">
        <Button variant="greyFilled" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={!canSubmit} loading={saving}>
          {spotlight ? "Save changes" : "Create spotlight"}
        </Button>
      </div>
    </div>
  );
}

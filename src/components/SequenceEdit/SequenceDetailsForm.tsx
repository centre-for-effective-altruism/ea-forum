"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { captureException } from "@sentry/nextjs";
import toast from "react-hot-toast";
import { rpc } from "@/lib/rpc";
import {
  editorContentsChanged,
  getBlankEditorContents,
  toEditorData,
  type EditorContents,
} from "@/lib/ckeditor/editorHelpers";
import type { SequenceEditPageData } from "@/lib/sequences/sequenceQueries";
import type { SequenceEditData } from "@/lib/sequences/sequenceHelpers";
import {
  emptyToNull,
  errorMessage,
  numberToInput,
  parseOptionalNumber,
} from "./sequenceEditFormHelpers";
import EditFormCard, { EditFormGroup } from "./EditFormCard";
import UserMultiSelect, { UserMultiSelectUser } from "../Inbox/UserMultiSelect";
import ImageUpload from "../Forms/ImageUpload";
import EditorInput from "../Forms/EditorInput";
import Checkbox from "../Forms/Checkbox";
import Input from "../Forms/Input";
import Type from "../Type";

type EditableSequence = SequenceEditPageData["sequence"];

const toAuthor = (user: EditableSequence["user"]): UserMultiSelectUser[] =>
  user ? [{ _id: user._id, displayName: user.displayName, username: null }] : [];

export default function SequenceDetailsForm({
  sequence,
  canEditModeratorFields,
  canEditAdminFields,
}: Readonly<{
  sequence: EditableSequence;
  canEditModeratorFields: boolean;
  canEditAdminFields: boolean;
}>) {
  const router = useRouter();
  const initialDescription =
    sequence.originalContents ?? getBlankEditorContents("ckEditorMarkup");
  const initialUserProfileOrder = numberToInput(sequence.userProfileOrder);
  const initialCuratedOrder = numberToInput(sequence.curatedOrder);
  const initialCollectionSlug = sequence.canonicalCollectionSlug ?? "";

  const [title, setTitle] = useState(sequence.title);
  const [description, setDescription] = useState<EditorContents>(initialDescription);
  const [bannerImageId, setBannerImageId] = useState(sequence.bannerImageId);
  const [gridImageId, setGridImageId] = useState(sequence.gridImageId);
  const [hideFromAuthorPage, setHideFromAuthorPage] = useState(
    sequence.hideFromAuthorPage,
  );
  const [draft, setDraft] = useState(sequence.draft);
  const [userProfileOrder, setUserProfileOrder] = useState(initialUserProfileOrder);
  const [hidden, setHidden] = useState(sequence.hidden);
  const [noindex, setNoindex] = useState(sequence.noindex);
  const [author, setAuthor] = useState(() => toAuthor(sequence.user));
  const [curatedOrder, setCuratedOrder] = useState(initialCuratedOrder);
  const [collectionSlug, setCollectionSlug] = useState(initialCollectionSlug);
  const [saving, setSaving] = useState(false);

  const authorId = author[0]?._id ?? null;

  const changes = {
    title: title !== sequence.title,
    contents: editorContentsChanged(description, initialDescription),
    bannerImageId: bannerImageId !== sequence.bannerImageId,
    gridImageId: gridImageId !== sequence.gridImageId,
    hideFromAuthorPage: hideFromAuthorPage !== sequence.hideFromAuthorPage,
    draft: draft !== sequence.draft,
    userProfileOrder: userProfileOrder !== initialUserProfileOrder,
    hidden: hidden !== sequence.hidden,
    noindex: noindex !== sequence.noindex,
    userId: canEditAdminFields && authorId !== sequence.userId,
    curatedOrder: curatedOrder !== initialCuratedOrder,
    canonicalCollectionSlug: collectionSlug !== initialCollectionSlug,
  };
  const hasChanges = Object.values(changes).some(Boolean);

  const buildData = (): SequenceEditData => {
    if (changes.title && !title.trim()) {
      throw new Error("Title is required");
    }
    if (changes.userId && !authorId) {
      throw new Error("Author is required");
    }
    return {
      ...(changes.title ? { title } : null),
      ...(changes.contents ? { contents: toEditorData(description) } : null),
      ...(changes.bannerImageId ? { bannerImageId } : null),
      ...(changes.gridImageId ? { gridImageId } : null),
      ...(changes.hideFromAuthorPage ? { hideFromAuthorPage } : null),
      ...(changes.draft ? { draft } : null),
      ...(changes.userProfileOrder
        ? {
            userProfileOrder: parseOptionalNumber(
              "User profile order",
              userProfileOrder,
            ),
          }
        : null),
      ...(changes.hidden ? { hidden } : null),
      ...(changes.noindex ? { noindex } : null),
      ...(changes.userId && authorId ? { userId: authorId } : null),
      ...(changes.curatedOrder
        ? { curatedOrder: parseOptionalNumber("Curated order", curatedOrder) }
        : null),
      ...(changes.canonicalCollectionSlug
        ? { canonicalCollectionSlug: emptyToNull(collectionSlug) }
        : null),
    };
  };

  const onSave = async () => {
    if (!hasChanges || saving) {
      return;
    }
    setSaving(true);
    try {
      await rpc.sequences.edit({ sequenceId: sequence._id, data: buildData() });
      toast.success(<Type>Sequence saved</Type>);
      router.refresh();
    } catch (e) {
      console.error(e);
      captureException(e);
      toast.error(<Type>{errorMessage(e)}</Type>);
    }
    setSaving(false);
  };

  const onChangeAuthor = (users: UserMultiSelectUser[]) => {
    setAuthor(users.slice(-1));
  };

  return (
    <EditFormCard
      title="Sequence details"
      hasChanges={hasChanges}
      saving={saving}
      onSave={onSave}
      saveEventProps={{ sequenceId: sequence._id }}
    >
      <Input value={title} setValue={setTitle} label="Title" />
      <EditorInput
        value={description}
        setValue={setDescription}
        collectionName="Sequences"
        fieldName="contents"
        label="Description"
        placeholder="Edit sequence description"
      />
      <ImageUpload
        value={bannerImageId}
        setValue={setBannerImageId}
        imageType="bannerImageId"
        label="Banner Image"
      />
      <ImageUpload
        value={gridImageId}
        setValue={setGridImageId}
        imageType="gridImageId"
        label="Card Image"
      />
      <div className="flex flex-col gap-2">
        <Checkbox
          label={{
            id: "sequenceHideFromAuthorPage",
            text: "Hide from my user profile",
          }}
          checked={hideFromAuthorPage}
          onChange={setHideFromAuthorPage}
        />
        <Checkbox
          label={{ id: "sequenceDraft", text: "Draft" }}
          checked={draft}
          onChange={setDraft}
        />
      </div>
      {canEditModeratorFields && (
        <EditFormGroup title="Moderator options">
          <Input
            value={userProfileOrder}
            setValue={setUserProfileOrder}
            label="User profile order"
          />
          <div className="flex flex-col gap-2">
            <Checkbox
              label={{ id: "sequenceHidden", text: "Hidden" }}
              checked={hidden}
              onChange={setHidden}
            />
            <Checkbox
              label={{ id: "sequenceNoindex", text: "Noindex" }}
              checked={noindex}
              onChange={setNoindex}
            />
          </div>
        </EditFormGroup>
      )}
      {canEditAdminFields && (
        <EditFormGroup title="Admin options">
          <UserMultiSelect value={author} onChange={onChangeAuthor} label="Author" />
          <Input
            value={curatedOrder}
            setValue={setCuratedOrder}
            label="Curated order"
          />
          <Input
            value={collectionSlug}
            setValue={setCollectionSlug}
            label="Collection slug"
          />
        </EditFormGroup>
      )}
    </EditFormCard>
  );
}

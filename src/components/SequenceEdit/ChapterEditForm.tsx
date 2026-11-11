"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { captureException } from "@sentry/nextjs";
import toast from "react-hot-toast";
import isEqual from "lodash/isEqual";
import { rpc } from "@/lib/rpc";
import {
  editorContentsChanged,
  getBlankEditorContents,
  toEditorData,
  type EditorContents,
} from "@/lib/ckeditor/editorHelpers";
import type { SequenceEditPageData } from "@/lib/sequences/sequenceQueries";
import type { ChapterEditData } from "@/lib/sequences/sequenceHelpers";
import {
  emptyToNull,
  errorMessage,
  numberToInput,
  parseOptionalNumber,
} from "./sequenceEditFormHelpers";
import EditFormCard from "./EditFormCard";
import SortablePostList from "./SortablePostList";
import EditorInput from "../Forms/EditorInput";
import Input from "../Forms/Input";
import Type from "../Type";

type EditableChapter = SequenceEditPageData["chapters"][number];

const getPostIds = (posts: EditableChapter["posts"]) => posts.map(({ _id }) => _id);

export default function ChapterEditForm({
  chapter,
  index,
  canEditAdminFields,
}: Readonly<{
  chapter: EditableChapter;
  index: number;
  canEditAdminFields: boolean;
}>) {
  const router = useRouter();
  const initialDescription =
    chapter.originalContents ?? getBlankEditorContents("ckEditorMarkup");
  const initialTitle = chapter.title ?? "";
  const initialSubtitle = chapter.subtitle ?? "";
  const initialNumber = numberToInput(chapter.number);

  const [title, setTitle] = useState(initialTitle);
  const [subtitle, setSubtitle] = useState(initialSubtitle);
  const [number, setNumber] = useState(initialNumber);
  const [description, setDescription] = useState<EditorContents>(initialDescription);
  const [posts, setPosts] = useState(chapter.posts);
  const [saving, setSaving] = useState(false);

  const postIds = getPostIds(posts);
  const changes = {
    title: title !== initialTitle,
    subtitle: subtitle !== initialSubtitle,
    number: number !== initialNumber,
    contents: editorContentsChanged(description, initialDescription),
    postIds: !isEqual(postIds, getPostIds(chapter.posts)),
  };
  const hasChanges = Object.values(changes).some(Boolean);

  const buildData = (): ChapterEditData => ({
    ...(changes.title ? { title: emptyToNull(title) } : null),
    ...(changes.subtitle ? { subtitle: emptyToNull(subtitle) } : null),
    ...(changes.number ? { number: parseOptionalNumber("Number", number) } : null),
    ...(changes.contents ? { contents: toEditorData(description) } : null),
    ...(changes.postIds ? { postIds } : null),
  });

  const onSave = async () => {
    if (!hasChanges || saving) {
      return;
    }
    setSaving(true);
    try {
      await rpc.chapters.edit({ chapterId: chapter._id, data: buildData() });
      toast.success(<Type>Chapter saved</Type>);
      router.refresh();
    } catch (e) {
      console.error(e);
      captureException(e);
      toast.error(<Type>{errorMessage(e)}</Type>);
    }
    setSaving(false);
  };

  return (
    <EditFormCard
      title={chapter.title || `Chapter ${index + 1}`}
      hasChanges={hasChanges}
      saving={saving}
      onSave={onSave}
      saveEventProps={{ chapterId: chapter._id }}
    >
      {canEditAdminFields && (
        <>
          <Input value={title} setValue={setTitle} label="Title" />
          <Input value={subtitle} setValue={setSubtitle} label="Subtitle" />
          <Input value={number} setValue={setNumber} label="Number" />
        </>
      )}
      <EditorInput
        value={description}
        setValue={setDescription}
        collectionName="Chapters"
        fieldName="contents"
        label="Description"
        placeholder="Edit chapter description"
      />
      <SortablePostList posts={posts} onChange={setPosts} />
    </EditFormCard>
  );
}

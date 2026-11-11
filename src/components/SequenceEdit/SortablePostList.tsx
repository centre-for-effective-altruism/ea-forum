"use client";

import { useCallback, useState } from "react";
import { captureException } from "@sentry/nextjs";
import toast from "react-hot-toast";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import Bars3Icon from "@heroicons/react/24/outline/Bars3Icon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import { rpc } from "@/lib/rpc";
import type { SequenceEditPageData } from "@/lib/sequences/sequenceQueries";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import { errorMessage } from "./sequenceEditFormHelpers";
import DocumentSelect from "../Forms/DocumentSelect";
import Button from "../Button";
import Type from "../Type";
import Link from "../Link";

export type SortablePost = SequenceEditPageData["chapters"][number]["posts"][number];

const SortablePostRow = ({
  post,
  onRemove,
}: Readonly<{
  post: SortablePost;
  onRemove: (_id: string) => void;
}>) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: post._id });
  const title = post.title || "Untitled post";
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx(
        "flex items-center gap-2 px-2 py-2 rounded border border-gray-200 bg-gray-0",
        isDragging && "relative z-10 shadow-md",
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${title}`}
        className="cursor-grab touch-none text-gray-600 hover:text-gray-1000"
      >
        <Bars3Icon className="w-4" />
      </button>
      <Type style="bodySmall" className="grow truncate text-gray-1000">
        <Link
          href={postGetPageUrl({ post })}
          openInNewTab
          className="hover:text-primary"
        >
          {title}
        </Link>
      </Type>
      {post.draft && (
        <Type
          As="span"
          style="bodyXSmall"
          className="shrink-0 px-1.5 rounded bg-gray-200 text-gray-600"
        >
          Draft
        </Type>
      )}
      <button
        type="button"
        onClick={onRemove.bind(null, post._id)}
        aria-label={`Remove ${title}`}
        className="cursor-pointer text-gray-600 hover:text-error"
      >
        <XMarkIcon className="w-4" />
      </button>
    </li>
  );
};

export default function SortablePostList({
  posts,
  onChange,
}: Readonly<{
  posts: SortablePost[];
  onChange: (posts: SortablePost[]) => void;
}>) {
  const [selectedId, setSelectedId] = useState("");
  const [adding, setAdding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over || active.id === over.id) {
        return;
      }
      const from = posts.findIndex(({ _id }) => _id === active.id);
      const to = posts.findIndex(({ _id }) => _id === over.id);
      onChange(arrayMove(posts, from, to));
    },
    [posts, onChange],
  );

  const onRemove = useCallback(
    (_id: string) => {
      onChange(posts.filter((post) => post._id !== _id));
    },
    [posts, onChange],
  );

  const postId = selectedId.trim();

  const onAdd = useCallback(async () => {
    if (!postId || adding) {
      return;
    }
    if (posts.some(({ _id }) => _id === postId)) {
      toast(<Type>That post is already in this chapter</Type>);
      return;
    }
    setAdding(true);
    try {
      const post = await rpc.posts.listById({ _id: postId });
      if (!post) {
        throw new Error("Post not found");
      }
      onChange([
        ...posts,
        { _id: post._id, title: post.title, slug: post.slug, draft: false },
      ]);
      setSelectedId("");
    } catch (e) {
      console.error(e);
      captureException(e);
      toast.error(<Type>{errorMessage(e)}</Type>);
    }
    setAdding(false);
  }, [postId, posts, onChange, adding]);

  return (
    <div data-component="SortablePostList" className="flex flex-col gap-3">
      <Type style="bodySmall" className="text-primary">
        Posts
      </Type>
      {posts.length ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={posts.map(({ _id }) => _id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex flex-col gap-2">
              {posts.map((post) => (
                <SortablePostRow key={post._id} post={post} onRemove={onRemove} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <Type style="bodySmall" className="text-gray-600">
          No posts
        </Type>
      )}
      <div className="flex items-end gap-2">
        <div className="grow">
          <DocumentSelect
            value={selectedId}
            setValue={setSelectedId}
            label="Add post"
            index="posts"
          />
        </div>
        <Button
          variant="greyFilled"
          onClick={onAdd}
          disabled={!postId || adding}
          loading={adding}
          eventProps={{ action: "addPostToChapter" }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useState } from "react";
import { captureException } from "@sentry/nextjs";
import { rpc } from "@/lib/rpc";
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
import DocumentSelect from "../Forms/DocumentSelect";
import Button from "../Button";
import Type from "../Type";
import Link from "../Link";

type SortableSequence = { _id: string; title: string | null };

const SortableSequenceRow = ({
  sequence,
  onRemove,
}: Readonly<{
  sequence: SortableSequence;
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
  } = useSortable({ id: sequence._id });
  const title = sequence.title || "Untitled sequence";
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
          href={`/s/${sequence._id}`}
          openInNewTab
          className="hover:text-primary"
        >
          {title}
        </Link>
      </Type>
      <button
        type="button"
        onClick={onRemove.bind(null, sequence._id)}
        aria-label={`Remove ${title}`}
        className="cursor-pointer text-gray-600 hover:text-error"
      >
        <XMarkIcon className="w-4" />
      </button>
    </li>
  );
};

export default function SortableSequenceList({
  sequences,
  onChange,
}: Readonly<{
  sequences: SortableSequence[];
  onChange: (sequences: SortableSequence[]) => void;
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
      const from = sequences.findIndex(({ _id }) => _id === active.id);
      const to = sequences.findIndex(({ _id }) => _id === over.id);
      onChange(arrayMove(sequences, from, to));
    },
    [sequences, onChange],
  );

  const onRemove = useCallback(
    (_id: string) => {
      onChange(sequences.filter((sequence) => sequence._id !== _id));
    },
    [sequences, onChange],
  );

  const sequenceId = selectedId.trim();
  const isDuplicate = sequences.some(({ _id }) => _id === sequenceId);

  const onAdd = useCallback(async () => {
    if (!sequenceId || isDuplicate) {
      return;
    }
    setAdding(true);
    try {
      const sequence = await rpc.sequences.listById({ _id: sequenceId });
      if (!sequence) {
        throw new Error("Sequence not found");
      }
      onChange([...sequences, { _id: sequence._id, title: sequence.title }]);
      setSelectedId("");
    } catch (e) {
      console.error(e);
      captureException(e);
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
    setAdding(false);
  }, [sequenceId, isDuplicate, sequences, onChange]);

  return (
    <div data-component="SortableSequenceList" className="flex flex-col gap-3">
      <Type style="bodySmall" className="text-primary">
        Sequences
      </Type>
      {sequences.length ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={sequences.map(({ _id }) => _id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex flex-col gap-2">
              {sequences.map((sequence) => (
                <SortableSequenceRow
                  key={sequence._id}
                  sequence={sequence}
                  onRemove={onRemove}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <Type style="bodySmall" className="text-gray-600">
          No sequences
        </Type>
      )}
      <div className="flex items-end gap-2">
        <div className="grow">
          <DocumentSelect
            value={selectedId}
            setValue={setSelectedId}
            label="Add sequence"
            index="sequences"
          />
        </div>
        <Button
          variant="greyFilled"
          onClick={onAdd}
          disabled={!sequenceId || isDuplicate || adding}
          loading={adding}
        >
          Add
        </Button>
      </div>
      {isDuplicate && (
        <Type style="bodySmall" className="text-warning">
          This sequence is already in the list
        </Type>
      )}
    </div>
  );
}

"use client";

import { useCallback, useMemo, useState } from "react";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import keyBy from "lodash/keyBy";
import { rpc } from "@/lib/rpc";
import { filterNonNull } from "@/lib/typeHelpers";
import type { MarginalFundingWeekAdminData } from "@/lib/marginalFundingWeekAdmin/marginalFundingWeekAdminQueries";
import Type from "../Type";
import {
  SortableSequencePostRow,
  UnsequencedPostRow,
} from "./MarginalFundingWeekAdminPostRow";

const EmptySection = ({ children }: Readonly<{ children: string }>) => (
  <Type style="bodySmall" className="text-gray-600">
    {children}
  </Type>
);

export default function MarginalFundingWeekAdminPage({
  tagFound,
  sequencePostIds: initialSequencePostIds,
  posts,
}: Readonly<MarginalFundingWeekAdminData>) {
  const [sequencePostIds, setSequencePostIds] = useState(initialSequencePostIds);
  const [saving, setSaving] = useState(false);

  const postsById = useMemo(() => keyBy(posts, "_id"), [posts]);
  const sequencePosts = filterNonNull(sequencePostIds.map((id) => postsById[id]));
  const unsequencedPosts = posts.filter(({ _id }) => !sequencePostIds.includes(_id));

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const save = useCallback(
    async (postIds: string[]) => {
      if (saving) {
        return;
      }
      const previousPostIds = sequencePostIds;
      setSequencePostIds(postIds);
      setSaving(true);
      try {
        await rpc.marginalFundingWeekAdmin.setSequencePosts({ postIds });
      } catch (e) {
        console.error(e);
        captureException(e);
        toast.error(
          <Type>{e instanceof Error ? e.message : "Something went wrong"}</Type>,
        );
        setSequencePostIds(previousPostIds);
      }
      setSaving(false);
    },
    [saving, sequencePostIds],
  );

  const onDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over || active.id === over.id) {
        return;
      }
      const from = sequencePostIds.indexOf(String(active.id));
      const to = sequencePostIds.indexOf(String(over.id));
      void save(arrayMove(sequencePostIds, from, to));
    },
    [sequencePostIds, save],
  );

  return (
    <main
      data-component="MarginalFundingWeekAdminPage"
      className="mx-auto w-full max-w-[1000px] px-4 pt-10 pb-[120px] flex flex-col gap-8"
    >
      <div>
        <Type style="commentsHeader">Marginal Funding Week sequence</Type>
        <Type style="bodySmall" className="mt-0.5 text-gray-600">
          Posts in the sequence are shown on the home page tab in order of karma.
          Changes are saved immediately.
        </Type>
        {!tagFound && (
          <Type style="bodySmall" className="mt-2 text-error">
            Marginal Funding Week tag not found
          </Type>
        )}
      </div>
      <section className="flex flex-col gap-3">
        <Type style="sectionTitleLarge">
          In the sequence ({sequencePosts.length})
        </Type>
        {sequencePosts.length ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={sequencePosts.map(({ _id }) => _id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="flex flex-col gap-1">
                {sequencePosts.map((post) => (
                  <SortableSequencePostRow
                    key={post._id}
                    post={post}
                    disabled={saving}
                    onRemove={() =>
                      save(sequencePostIds.filter((id) => id !== post._id))
                    }
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        ) : (
          <EmptySection>No posts in the sequence</EmptySection>
        )}
      </section>
      <section className="flex flex-col gap-3">
        <Type style="sectionTitleLarge">
          Not in the sequence ({unsequencedPosts.length})
        </Type>
        {unsequencedPosts.length ? (
          <ul className="flex flex-col gap-1">
            {unsequencedPosts.map((post) => (
              <UnsequencedPostRow
                key={post._id}
                post={post}
                disabled={saving}
                onAdd={() => save([...sequencePostIds, post._id])}
              />
            ))}
          </ul>
        ) : (
          <EmptySection>No other tagged posts</EmptySection>
        )}
      </section>
    </main>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { captureException } from "@sentry/nextjs";
import toast from "react-hot-toast";
import { rpc } from "@/lib/rpc";
import {
  selectActiveSpotlight,
  SpotlightSequencePost,
} from "@/lib/spotlights/spotlightHelpers";
import type { AdminSpotlight } from "@/lib/spotlights/spotlightQueries";
import SpotlightItem from "@/components/Spotlights/SpotlightItem";
import Button from "@/components/Button";
import Type from "@/components/Type";
import SpotlightForm from "./SpotlightForm";

/**
 * Renders a spotlight exactly as it will appear on the front page. For
 * sequence spotlights this also loads the sequence's posts so the
 * read-progress boxes show up in the preview.
 */
function SpotlightPreview({
  spotlight,
}: Readonly<{
  spotlight: AdminSpotlight;
}>) {
  const [sequencePosts, setSequencePosts] = useState<
    SpotlightSequencePost[] | undefined
  >();

  const isSequence = spotlight.documentType === "Sequence";
  const { documentId } = spotlight;
  useEffect(() => {
    if (!isSequence) {
      setSequencePosts(undefined);
      return;
    }
    void (async () => {
      try {
        const posts = await rpc.sequences.listPosts({ sequenceId: documentId });
        setSequencePosts(
          posts.map((post) => ({
            _id: post._id,
            slug: post.slug,
            title: post.title,
            isRead: !!post.readStatus?.[0]?.isRead,
          })),
        );
      } catch (e) {
        captureException(e);
      }
    })();
  }, [isSequence, documentId]);

  if (!spotlight.display) {
    return (
      <Type style="bodySmall" className="text-warning">
        The linked {spotlight.documentType.toLowerCase()} could not be found, so this
        spotlight will not be shown.
      </Type>
    );
  }
  return <SpotlightItem spotlight={{ ...spotlight.display, sequencePosts }} />;
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

function SpotlightListEntry({
  spotlight,
  onEdit,
  onDelete,
  withPreview,
}: Readonly<{
  spotlight: AdminSpotlight;
  onEdit: (spotlight: AdminSpotlight) => void;
  onDelete: (spotlight: AdminSpotlight) => void;
  withPreview?: boolean;
}>) {
  return (
    <div className="flex flex-col gap-2 rounded border border-gray-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Type style="bodyHeavy">{spotlight.title}</Type>
          <Type style="bodySmall" className="text-gray-600">
            {spotlight.documentType}
            {spotlight.documentTitle ? `: ${spotlight.documentTitle}` : ""}
            {" · "}
            {formatDateTime(spotlight.startAt)} → {formatDateTime(spotlight.endAt)}
          </Type>
        </div>
        <div className="flex gap-2">
          <Button variant="greyOutlined" onClick={() => onEdit(spotlight)}>
            Edit
          </Button>
          <Button variant="greyOutlined" onClick={() => onDelete(spotlight)}>
            Delete
          </Button>
        </div>
      </div>
      {withPreview && <SpotlightPreview spotlight={spotlight} />}
    </div>
  );
}

export default function SpotlightsAdmin({
  initialSpotlights,
}: Readonly<{
  initialSpotlights: AdminSpotlight[];
}>) {
  const [spotlights, setSpotlights] = useState(initialSpotlights);
  const [editing, setEditing] = useState<AdminSpotlight | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const updated = await rpc.spotlights.listAll();
      setSpotlights(updated);
    } catch (e) {
      captureException(e);
    }
  }, []);

  const onSaved = useCallback(() => {
    setEditing(null);
    setCreating(false);
    void refresh();
  }, [refresh]);

  const onCancel = useCallback(() => {
    setEditing(null);
    setCreating(false);
  }, []);

  const onEdit = useCallback((spotlight: AdminSpotlight) => {
    setCreating(false);
    setEditing(spotlight);
  }, []);

  const onDelete = useCallback(
    (spotlight: AdminSpotlight) => {
      if (!window.confirm(`Delete the spotlight "${spotlight.title}"?`)) {
        return;
      }
      const action = rpc.spotlights.delete({ _id: spotlight._id });
      void toast
        .promise(action, {
          loading: <Type>Deleting spotlight...</Type>,
          success: <Type>Spotlight deleted</Type>,
          error: <Type>Something went wrong</Type>,
        })
        .then(refresh)
        .catch(captureException);
    },
    [refresh],
  );

  const nowIso = new Date().toISOString();
  const active = selectActiveSpotlight(spotlights);
  const upcoming = spotlights
    .filter(
      (spotlight) =>
        spotlight !== active &&
        spotlight.endAt > nowIso &&
        spotlight.startAt > nowIso,
    )
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  // Started but currently overridden by a more recently-started spotlight
  const overridden = spotlights.filter(
    (spotlight) =>
      spotlight !== active &&
      spotlight.endAt > nowIso &&
      spotlight.startAt <= nowIso,
  );
  const past = spotlights.filter((spotlight) => spotlight.endAt <= nowIso);

  const formOpen = creating || !!editing;
  return (
    <div className="mx-auto my-8 flex w-[780px] max-w-full flex-col gap-6 px-4">
      <div className="flex items-center justify-between">
        <Type style="commentsHeader">Spotlights</Type>
        {!formOpen && (
          <Button onClick={() => setCreating(true)}>New spotlight</Button>
        )}
      </div>
      {formOpen && (
        <SpotlightForm
          key={editing?._id ?? "new"}
          spotlight={editing ?? undefined}
          onSaved={onSaved}
          onCancel={onCancel}
        />
      )}
      <section className="flex flex-col gap-2">
        <Type style="sectionTitleLarge">Active</Type>
        {active ? (
          <SpotlightListEntry
            spotlight={active}
            onEdit={onEdit}
            onDelete={onDelete}
            withPreview
          />
        ) : (
          <Type style="bodySmall" className="text-gray-600">
            No spotlight is currently active, so the front page shows nothing.
          </Type>
        )}
      </section>
      <section className="flex flex-col gap-2">
        <Type style="sectionTitleLarge">Upcoming</Type>
        <Type style="bodySmall" className="text-gray-600">
          Scheduled spotlights that haven&apos;t started yet. Each preview shows
          exactly how the spotlight will look on the front page.
        </Type>
        {upcoming.length === 0 && (
          <Type style="bodySmall" className="text-gray-600">
            Nothing scheduled.
          </Type>
        )}
        {upcoming.map((spotlight) => (
          <SpotlightListEntry
            key={spotlight._id}
            spotlight={spotlight}
            onEdit={onEdit}
            onDelete={onDelete}
            withPreview
          />
        ))}
      </section>
      {overridden.length > 0 && (
        <section className="flex flex-col gap-2">
          <Type style="sectionTitleLarge">Overridden</Type>
          <Type style="bodySmall" className="text-gray-600">
            These are within their scheduled window but hidden because a more
            recently-started spotlight takes precedence.
          </Type>
          {overridden.map((spotlight) => (
            <SpotlightListEntry
              key={spotlight._id}
              spotlight={spotlight}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </section>
      )}
      {past.length > 0 && (
        <section className="flex flex-col gap-2">
          <Type style="sectionTitleLarge">Past</Type>
          {past.map((spotlight) => (
            <SpotlightListEntry
              key={spotlight._id}
              spotlight={spotlight}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </section>
      )}
    </div>
  );
}

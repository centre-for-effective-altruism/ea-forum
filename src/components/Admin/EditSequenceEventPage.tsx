"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { captureException } from "@sentry/nextjs";
import { rpc } from "@/lib/rpc";
import toast from "react-hot-toast";
import {
  sequenceEventPagePath,
  sequenceEventPageSchema,
  type SequenceEventPage,
} from "@/lib/sequences/sequenceEvents";
import DocumentSelect from "../Forms/DocumentSelect";
import ImageUpload from "../Forms/ImageUpload";
import ColorPicker from "../Forms/ColorPicker";
import ToggleSwitch from "../Forms/ToggleSwitch";
import Select from "../Forms/Select";
import Input from "../Forms/Input";
import Button from "../Button";
import Link from "../Link";
import Type from "../Type";

const ADMIN_PATH = "/admin/sequence-events";

/** Colours are required by the schema, so they're never cleared to null */
const setColor = (setValue: (value: string) => void) => (value: string | null) =>
  setValue(value ?? "#000000");

export default function EditSequenceEventPage({
  page,
  isNew,
}: Readonly<{
  page: SequenceEventPage;
  isNew: boolean;
}>) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [slug, setSlug] = useState(page.slug);
  const [sequenceId, setSequenceId] = useState(page.sequenceId);
  const [title, setTitle] = useState(page.title);
  const [description, setDescription] = useState(page.description);
  const [socialImageId, setSocialImageId] = useState(page.socialImageId);
  const [listenUrl, setListenUrl] = useState(page.listenUrl);
  const [themeColor, setThemeColor] = useState(page.themeColor);
  const [hoverColor, setHoverColor] = useState(page.hoverColor);
  const [textColor, setTextColor] = useState(page.textColor);
  const [postOrder, setPostOrder] = useState(page.postOrder);
  const [published, setPublished] = useState(page.published);

  const onSave = useCallback(async () => {
    const parsed = sequenceEventPageSchema.safeParse({
      slug,
      sequenceId,
      title,
      description,
      socialImageId,
      listenUrl,
      themeColor,
      hoverColor,
      textColor,
      postOrder,
      published,
    });
    if (!parsed.success) {
      const { message, path } = parsed.error.issues[0];
      toast.error(`${path.join(".") || "Page"}: ${message}`);
      return;
    }
    setSaving(true);
    const toastId = toast.loading("Saving...");
    try {
      await rpc.sequenceEventPages.save({
        page: parsed.data,
        previousSlug: isNew ? undefined : page.slug,
      });
      router.push(ADMIN_PATH);
    } catch (e) {
      console.error(e);
      captureException(e);
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
    toast.dismiss(toastId);
    setSaving(false);
  }, [
    router,
    isNew,
    page.slug,
    slug,
    sequenceId,
    title,
    description,
    socialImageId,
    listenUrl,
    themeColor,
    hoverColor,
    textColor,
    postOrder,
    published,
  ]);

  const onDelete = useCallback(async () => {
    if (!window.confirm(`Delete "${page.title || page.slug}"?`)) {
      return;
    }
    setSaving(true);
    const toastId = toast.loading("Deleting...");
    try {
      await rpc.sequenceEventPages.delete({ slug: page.slug });
      router.push(ADMIN_PATH);
    } catch (e) {
      console.error(e);
      captureException(e);
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
    toast.dismiss(toastId);
    setSaving(false);
  }, [router, page.slug, page.title]);

  return (
    <form data-component="EditSequenceEventPage" className="flex flex-col gap-4">
      <Type style="sectionTitleLarge">
        {isNew ? "New series page" : `Edit ${page.title || page.slug}`}
      </Type>
      <Input
        value={slug}
        setValue={setSlug}
        label="URL slug"
        placeholder="e.g. scaling-series"
      />
      <Type style="bodySmall" className="text-gray-600 -mt-2">
        The page will live at <code>{sequenceEventPagePath(slug || "<slug>")}</code>
        {". "}
        Lowercase letters, numbers and single hyphens only.
      </Type>
      <DocumentSelect
        value={sequenceId}
        setValue={setSequenceId}
        label="Sequence"
        index="sequences"
      />
      <Type style="bodyHeavy" className="text-right">
        {sequenceId ? (
          <Link
            href={`/s/${sequenceId}`}
            className="text-primary-dark hover:text-primary"
            openInNewTab
          >
            View selected sequence
          </Link>
        ) : (
          "No sequence selected"
        )}
      </Type>
      <Input
        value={title}
        setValue={setTitle}
        label="Page title"
        placeholder="Used for the browser tab and when the page is shared"
      />
      <Input
        value={description}
        setValue={setDescription}
        label="Description"
        placeholder="Shown when the page is shared. The heading and blurb on the page itself come from the sequence."
        multiline
      />
      <div className="flex flex-wrap items-start gap-8">
        <ColorPicker
          value={themeColor}
          setValue={setColor(setThemeColor)}
          label="Background colour"
        />
        <ColorPicker
          value={hoverColor}
          setValue={setColor(setHoverColor)}
          label="Hover colour"
        />
        <ColorPicker
          value={textColor}
          setValue={setColor(setTextColor)}
          label="Font colour"
        />
      </div>
      <Type style="bodySmall" className="text-gray-600 -mt-2">
        The background colour fills the header and posts that have been read. The
        hover colour fills a post when the mouse is over it.
      </Type>
      <Select
        value={postOrder}
        setValue={setPostOrder}
        label="Post order"
        options={[
          { label: "First post, then by karma", value: "score" },
          { label: "Sequence order", value: "sequence" },
        ]}
      />
      <Input
        value={listenUrl}
        setValue={setListenUrl}
        label="Listen link (optional)"
        placeholder="e.g. a Spotify playlist of the posts"
      />
      <ImageUpload
        value={socialImageId}
        setValue={setSocialImageId}
        imageType="socialPreviewImageId"
        label="Sharing image (optional)"
      />
      <div>
        <Type style="bodySmall" className="text-[12px] font-[400] text-primary">
          Published
        </Type>
        <div className="flex items-center gap-3 mt-1">
          <ToggleSwitch value={published} setValue={setPublished} />
          <Type style="bodySmall" className="text-gray-600">
            {published
              ? "Anybody can see this page"
              : "Only admins can see this page"}
          </Type>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4">
        {!isNew && (
          <Button variant="greyOutlined" onClick={onDelete} disabled={saving}>
            Delete
          </Button>
        )}
        <div className="grow" />
        <Button variant="greyFilled" href={ADMIN_PATH}>
          Cancel
        </Button>
        <Button variant="primaryFilled" onClick={onSave} loading={saving}>
          Save
        </Button>
      </div>
    </form>
  );
}

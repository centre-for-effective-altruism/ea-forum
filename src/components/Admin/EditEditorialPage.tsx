"use client";

import { ReactNode, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { captureException } from "@sentry/nextjs";
import { rpc } from "@/lib/rpc";
import toast from "react-hot-toast";
import {
  editorialPageSchema,
  type EditorialPage,
} from "@/lib/sequences/editorialPages";
import {
  ADMIN_EDITORIAL_PAGES_PATH,
  editorialPagePath,
  editorialPageRoutePath,
} from "@/lib/sequences/editorialPagePaths";
import { sequenceGetSequencePageUrl } from "@/lib/sequences/sequenceHelpers";
import DocumentSelect from "../Forms/DocumentSelect";
import ImageUpload from "../Forms/ImageUpload";
import ColorPicker from "../Forms/ColorPicker";
import ToggleSwitch from "../Forms/ToggleSwitch";
import Select from "../Forms/Select";
import Input from "../Forms/Input";
import Label from "../Forms/Label";
import Button from "../Button";
import Link from "../Link";
import Type from "../Type";

/** Colours are required by the schema, so they're never cleared to null */
const setColor = (setValue: (value: string) => void) => (value: string | null) =>
  setValue(value ?? "#000000");

const Hint = ({ children }: { children: ReactNode }) => (
  <Type style="bodySmall" className="text-gray-600 -mt-2">
    {children}
  </Type>
);

export default function EditEditorialPage({
  page,
  previousSlug,
}: Readonly<{
  page: EditorialPage;
  /** The slug this page is stored under, absent when creating a new one */
  previousSlug?: string;
}>) {
  const router = useRouter();
  const publishedId = useId();
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

  const run = async (loading: string, action: () => Promise<unknown>) => {
    setSaving(true);
    const toastId = toast.loading(loading);
    try {
      await action();
      router.push(ADMIN_EDITORIAL_PAGES_PATH);
    } catch (e) {
      console.error(e);
      captureException(e);
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
    toast.dismiss(toastId);
    setSaving(false);
  };

  const onSave = async () => {
    const parsed = editorialPageSchema.safeParse({
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
    await run("Saving...", () =>
      rpc.editorialPages.save({ page: parsed.data, previousSlug }),
    );
  };

  const onDelete = async () => {
    if (
      !previousSlug ||
      !window.confirm(`Delete "${page.title || previousSlug}"?`)
    ) {
      return;
    }
    await run("Deleting...", () =>
      rpc.editorialPages.delete({ slug: previousSlug }),
    );
  };

  return (
    <form data-component="EditEditorialPage" className="flex flex-col gap-4">
      <Type style="sectionTitleLarge">
        {previousSlug ? `Edit ${page.title || previousSlug}` : "New editorial page"}
      </Type>
      <Input
        value={slug}
        setValue={setSlug}
        label="URL"
        placeholder="e.g. scaling-series"
      />
      <Hint>
        The page will live at <code>{editorialPagePath(slug || "<url>")}</code>.
        Lowercase letters, numbers and single hyphens only, and it can&apos;t be a
        URL something on the Forum already uses.
      </Hint>
      <DocumentSelect
        value={sequenceId}
        setValue={setSequenceId}
        label="Sequence"
        index="sequences"
      />
      <Type style="bodyHeavy" className="text-right">
        {sequenceId ? (
          <Link
            href={sequenceGetSequencePageUrl({ sequence: { _id: sequenceId } })}
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
      <Hint>
        The background colour fills the header and posts that have been read. The
        hover colour fills a post when the mouse is over it.
      </Hint>
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
        <Label htmlFor={publishedId}>Published</Label>
        <div className="flex items-center gap-3">
          <ToggleSwitch id={publishedId} value={published} setValue={setPublished} />
          <Type style="bodySmall" className="text-gray-600">
            {published
              ? "Anybody can see this page"
              : "Only admins can see it, at " + editorialPageRoutePath(slug)}
          </Type>
        </div>
      </div>
      <Hint>
        A published page can take up to a minute to start answering at its URL.
      </Hint>
      <div className="flex items-center gap-2 mt-4">
        {previousSlug && (
          <Button variant="greyOutlined" onClick={onDelete} disabled={saving}>
            Delete
          </Button>
        )}
        <div className="grow" />
        <Button variant="greyFilled" href={ADMIN_EDITORIAL_PAGES_PATH}>
          Cancel
        </Button>
        <Button variant="primaryFilled" onClick={onSave} loading={saving}>
          Save
        </Button>
      </div>
    </form>
  );
}

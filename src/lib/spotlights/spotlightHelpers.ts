import { z } from "zod/v4";
import { editorDataSchema } from "../ckeditor/editorHelpers";

export const spotlightDocumentTypeSchema = z.enum(["Post", "Sequence"]);

export type SpotlightDocumentType = z.infer<typeof spotlightDocumentTypeSchema>;

const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #0c869b");

/**
 * Shared input contract for creating/updating spotlights. `imageId` is
 * required: a spotlight cannot exist without a background image.
 */
export const spotlightInputSchema = z
  .object({
    documentType: spotlightDocumentTypeSchema,
    documentId: z.string().trim().nonempty().max(27),
    title: z.string().trim().nonempty().max(300),
    description: editorDataSchema.optional(),
    imageId: z.string().trim().nonempty().max(300),
    blockColor: hexColorSchema.nullable(),
    showBlockColor: z.boolean(),
    startAt: z.iso.datetime(),
    endAt: z.iso.datetime(),
  })
  .refine((data) => new Date(data.startAt) < new Date(data.endAt), {
    message: "Start date must be before end date",
    path: ["endAt"],
  });

export type SpotlightInput = z.infer<typeof spotlightInputSchema>;

/**
 * A spotlight is active when `startAt <= now < endAt`. If several overlap, the
 * one with the most recent start wins. Returns `null` if none is active.
 */
export const selectActiveSpotlight = <T extends { startAt: string; endAt: string }>(
  spotlights: T[],
  now: Date = new Date(),
): T | null => {
  let winner: T | null = null;
  for (const spotlight of spotlights) {
    const startAt = new Date(spotlight.startAt);
    const endAt = new Date(spotlight.endAt);
    if (startAt <= now && now < endAt) {
      if (!winner || startAt > new Date(winner.startAt)) {
        winner = spotlight;
      }
    }
  }
  return winner;
};

/** Minimal data needed to render the sequence read-progress boxes */
export type SpotlightSequencePost = {
  _id: string;
  slug: string;
  title: string;
  isRead: boolean;
};

/** Everything the frontend needs to render a spotlight */
export type SpotlightDisplay = {
  _id: string;
  documentType: SpotlightDocumentType;
  documentId: string;
  title: string;
  descriptionHtml: string | null;
  imageId: string;
  blockColor: string | null;
  showBlockColor: boolean;
  /** Link target for the title (post or sequence page) */
  url: string;
  /** Posts in the spotlighted sequence (empty for post spotlights) */
  sequencePosts: SpotlightSequencePost[];
};

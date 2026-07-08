import { editorDataSchema } from "../ckeditor/editorHelpers";
import z from "zod/v4";

export const spotlightEditDataSchema = z
  .object({
    documentType: z.enum(["Post", "Sequence"]),
    documentId: z.string(),
    title: z.string().nullable(),
    imageId: z.string().nullable(),
    description: editorDataSchema.nullable(),
    imageFadeColor: z.string().nullable(),
    startAt: z.date().nullable(),
    endAt: z.date().nullable(),
  })
  .partial();

export type SpotlightEditData = z.infer<typeof spotlightEditDataSchema>;

import z from "zod/v4";
import { editorDataSchema } from "../ckeditor/editorHelpers";

export const bookEditDataSchema = z
  .object({
    title: z.string(),
    description: editorDataSchema.nullable(),
    sequenceIds: z.array(z.string().nonempty()),
  })
  .partial()
  .strict();

export type BookEditData = z.infer<typeof bookEditDataSchema>;

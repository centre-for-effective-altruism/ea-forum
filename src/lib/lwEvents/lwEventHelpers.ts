import { z } from "zod/v4";
import { jsonRecordSchema } from "../typeHelpers";

export const createLWEventSchema = z.object({
  name: z.string().nonempty(),
  documentId: z.string().nullable().optional(),
  important: z.boolean().nullable().optional(),
  properties: jsonRecordSchema.nullable().optional(),
  intercom: z.boolean().nullable().optional(),
});

export type CreateLWEvent = z.infer<typeof createLWEventSchema>;

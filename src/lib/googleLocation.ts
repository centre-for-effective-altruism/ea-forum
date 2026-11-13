import { z } from "zod/v4";

export const googleLocationSchema = z
  .object({
    formatted_address: z.string().optional(),
    geometry: z
      .object({ location: z.object({ lat: z.number(), lng: z.number() }) })
      .catchall(z.json()),
  })
  .catchall(z.json());

export const labelledLocationSchema = z.object({
  label: z.string().trim().nonempty().max(500),
  googleLocation: googleLocationSchema,
});

export type LabelledLocation = z.infer<typeof labelledLocationSchema>;

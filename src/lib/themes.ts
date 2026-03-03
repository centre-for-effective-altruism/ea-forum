import { z } from "zod/v4";

export const themeSchema = z.enum(["auto", "default", "dark"]);

export type Theme = z.infer<typeof themeSchema>;

export const validateThemeWithDefault = (
  maybeTheme: unknown,
  defaultTheme: Theme = "auto",
): Theme =>
  themeSchema.safeParse(maybeTheme).success ? (maybeTheme as Theme) : defaultTheme;

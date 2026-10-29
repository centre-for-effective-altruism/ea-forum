import { z } from "zod/v4";

export const themeSchema = z.enum(["auto", "default", "dark"]);

export type Theme = z.infer<typeof themeSchema>;

export const validateThemeWithDefault = (
  maybeTheme: unknown,
  defaultTheme: Theme = "auto",
): Theme =>
  themeSchema.safeParse(maybeTheme).success ? (maybeTheme as Theme) : defaultTheme;

export const themeClasses: Record<Theme, string> = {
  auto: "theme-auto",
  default: "theme-light",
  dark: "theme-dark",
};

/**
 * The static shell is rendered with the "auto" theme on the html element. This
 * runs before the first paint to apply the theme from the cookie, so that users
 * with an explicit theme don't see a flash of the wrong theme.
 */
export const themeScript = `(() => {
const classes = ${JSON.stringify(themeClasses)}
const match = document.cookie.match(/(?:^|;\\s*)theme=([^;]*)/)
const theme = match ? decodeURIComponent(match[1]) : null
const root = document.documentElement
root.classList.remove(...Object.values(classes))
root.classList.add(Object.hasOwn(classes, theme) ? classes[theme] : classes.auto)
})()`;

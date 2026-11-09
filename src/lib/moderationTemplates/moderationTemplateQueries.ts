import { db } from "../db";
import { userIsAdminOrMod } from "../users/userHelpers";
import type { CurrentUser } from "../users/currentUser";

export const fetchModerationTemplate = async (
  user: CurrentUser | null,
  templateId: string,
) => {
  if (!userIsAdminOrMod(user)) {
    return null;
  }
  const template = await db.query.moderationTemplates.findFirst({
    columns: {
      _id: true,
      name: true,
    },
    extras: {
      html: (templates, { sql }) =>
        sql<string | null>`${templates}."contents"->>'html'`,
    },
    where: { _id: templateId },
  });
  return template ?? null;
};

export type ModerationTemplateForMessage = NonNullable<
  Awaited<ReturnType<typeof fetchModerationTemplate>>
>;

import { sql } from "drizzle-orm";
import { db } from "../db";

export const fetchConversationByParticipants = async (
  participantIds: string[],
  moderator: boolean,
): Promise<string | null> => {
  const ids = sql.join(
    participantIds.map((id) => sql`${id}`),
    sql`, `,
  );
  const result = await db.query.conversations.findFirst({
    columns: {
      _id: true,
    },
    where: {
      ...(moderator
        ? { moderator: true }
        : {
            OR: [{ moderator: false }, { moderator: { isNull: true } }],
          }),
      RAW: (conversationsTable) => sql<boolean>`(
        ${conversationsTable}."participantIds" @> ARRAY[${ids}]::VARCHAR[] AND
        ${conversationsTable}."participantIds" <@ ARRAY[${ids}]::VARCHAR[]
      )`,
    },
  });
  return result?._id ?? null;
};

import { cache } from "react";
import { db } from "@/lib/db";

export const fetchCoreTags = cache(() => {
  return db.query.tags.findMany({
    columns: {
      _id: true,
      name: true,
      shortName: true,
      slug: true,
    },
    where: {
      core: true,
      wikiOnly: false,
      deleted: false,
    },
    orderBy: {
      defaultOrder: "desc",
      name: "asc",
    },
  });
});

export type CoreTag = Awaited<ReturnType<typeof fetchCoreTags>>[0];

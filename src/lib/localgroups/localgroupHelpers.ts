import type { Localgroup } from "../schema";

export const localgroupGetPageUrl = ({
  localgroup,
}: {
  localgroup: Pick<Localgroup, "_id">;
}) => `/groups/${localgroup._id}`;

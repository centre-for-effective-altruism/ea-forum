import type { SearchUser } from "@/lib/search/searchDocuments";
import { formatStat } from "@/lib/formatHelpers";
import Type from "../Type";

export default function PeopleDirectoryNumberCell({
  user,
  fieldName,
}: Readonly<{
  user: SearchUser;
  fieldName: keyof SearchUser;
}>) {
  const value = Number(user[fieldName] ?? 0);
  return (
    <Type
      style="directoryCell"
      className="whitespace-nowrap"
      data-component="PeopleDirectoryNumberCell"
    >
      {formatStat(value)}
    </Type>
  );
}

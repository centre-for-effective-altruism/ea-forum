import type { SearchUser } from "@/lib/search/searchDocuments";
import { userGetProfileUrl } from "@/lib/users/userHelpers";
import { useClickableCell } from "@/lib/hooks/useClickableCell";
import { usePeopleDirectory } from "./usePeopleDirectory";
import PeopleDirectoryCell from "./PeopleDirectoryCell";

export default function PeopleDirectoryResultRow({
  result,
}: Readonly<{
  result?: SearchUser;
}>) {
  const { onClick } = useClickableCell({
    href: result ? `${userGetProfileUrl(result)}?from=people_directory` : "#",
    ignoreLinks: true,
    openInNewTab: true,
  });
  const { columns } = usePeopleDirectory();
  return (
    <div
      data-component="PeopleDirectoryResultRow"
      className="people-directory-result-row"
      onClick={onClick}
    >
      {columns.map((column) => (
        <PeopleDirectoryCell key={column.label} result={result} column={column} />
      ))}
    </div>
  );
}

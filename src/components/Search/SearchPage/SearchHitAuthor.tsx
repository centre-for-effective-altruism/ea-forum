import { userGetProfileUrl } from "@/lib/users/userHelpers";
import Link from "../../Link";

export default function SearchHitAuthor({
  authorSlug,
  authorDisplayName,
  className = "hover:text-gray-1000",
}: Readonly<{
  authorSlug?: string | null;
  authorDisplayName?: string | null;
  className?: string;
}>) {
  if (!authorSlug) {
    return <span>{authorDisplayName ?? "[anonymous]"}</span>;
  }
  return (
    <Link
      href={userGetProfileUrl({ user: { slug: authorSlug }, from: "search_page" })}
      className={className}
    >
      {authorDisplayName}
    </Link>
  );
}

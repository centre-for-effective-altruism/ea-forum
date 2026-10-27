import type { CurrentUser } from "@/lib/users/currentUser";
import type { TopicPageTag } from "@/lib/tags/tagPageQueries";

export default function TopicHeaderActions(
  _props: Readonly<{ tag: TopicPageTag; currentUser: CurrentUser | null }>,
) {
  return null;
}

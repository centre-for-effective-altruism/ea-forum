import type { SearchTag } from "@/lib/search/searchDocuments";
import TagIcon from "@heroicons/react/24/outline/TagIcon";
import Type from "../Type";

export default function TagMentionHit({ hit }: Readonly<{ hit: SearchTag }>) {
  return (
    <article data-component="TagMentionHit" className="flex items-center gap-2">
      <TagIcon className="w-4" />
      <Type style="bodySmall">{hit.name}</Type>
    </article>
  );
}

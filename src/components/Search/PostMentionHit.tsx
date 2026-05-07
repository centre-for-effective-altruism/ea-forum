import type { SearchPost } from "@/lib/search/searchDocuments";
import DocumentTextIcon from "@heroicons/react/24/outline/DocumentTextIcon";
import Type from "../Type";

export default function PostMentionHit({ hit }: Readonly<{ hit: SearchPost }>) {
  return (
    <article data-component="PostMentionHit" className="flex items-center gap-2">
      <DocumentTextIcon className="w-4" />
      <Type style="bodySmall">{hit.title}</Type>
    </article>
  );
}

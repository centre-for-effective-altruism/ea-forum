import { fetchTagPage } from "@/lib/tags/tagQueries";
import CommentBody from "../ContentStyles/CommentBody";

export default async function TagWiki() {
  const wikiTag = await fetchTagPage("wiki");
  if (!wikiTag) {
    return null;
  }
  return (
    <div data-component="TagWiki" className="rounded bg-gray-0 px-5 py-3">
      <CommentBody html={wikiTag.description} />
    </div>
  );
}

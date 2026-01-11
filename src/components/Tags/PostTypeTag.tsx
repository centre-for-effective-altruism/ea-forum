import type { PostDisplay } from "@/lib/posts/postQueries";
import TagChipDisplay from "./TagChipDisplay";
import Tooltip from "../Tooltip";
import Type from "../Type";

export default function PostTypeTag({
  post,
}: Readonly<{
  post: PostDisplay;
}>) {
  if (post.curatedDate) {
    return (
      <Tooltip
        placement="bottom-start"
        title={
          <Type style="bodySmall">
            The best 2-3 posts each week, selected by the moderation team. Curated
            posts are featured at the top of the front page and emailed to
            subscribers.
          </Type>
        }
      >
        <TagChipDisplay name="Curated" href="/recommendations" variant="postType" />
      </Tooltip>
    );
  }
  if (post.frontpageDate) {
    return (
      <Tooltip
        placement="bottom-start"
        title={
          <Type style="bodySmall">
            Posts that are relevant to doing good effectively.
          </Type>
        }
      >
        <TagChipDisplay
          name="Frontpage"
          href="/about#Finding_content"
          variant="postType"
        />
      </Tooltip>
    );
  }
  if (post.reviewedByUserId) {
    return (
      <Tooltip
        placement="bottom-start"
        title={
          <Type style="bodySmall">
            <div>Users can write whatever they want on their personal blog.</div>
            <div>This category is a good fit for:</div>
            <ul className="list-disc [&_li]:ml-4">
              <li>topics that aren&apos;t closely related to EA</li>
              <li>topics that are difficult to discuss rationally</li>
              <li>
                topics of interest to a small fraction of the Forum’s readers (e.g.
                local events)
              </li>
            </ul>
          </Type>
        }
      >
        <TagChipDisplay
          name="Personal Blog"
          href="/posts/5TAwep4tohN7SGp3P/the-frontpage-community-distinction"
          variant="postType"
        />
      </Tooltip>
    );
  }
  return null;
}

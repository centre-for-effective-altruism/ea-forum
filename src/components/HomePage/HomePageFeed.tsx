import { fetchCoreTags } from "@/lib/tags/tagQueries";
import type { NextSearchParams } from "@/lib/typeHelpers";
import Type from "../Type";
import FrontpagePostsList from "../PostsList/FrontpagePostsList";
import FrontpageQuickTakesList from "../QuickTakes/FrontpageQuickTakesList";

export default async function HomePageFeed({
  search,
}: {
  search: NextSearchParams;
}) {
  const communityTagId = process.env.COMMUNITY_TAG_ID;
  const coreTags = await fetchCoreTags();
  const activeTag =
    search.tab && typeof search.tab === "string"
      ? coreTags.find((tag) => tag.slug === search.tab)
      : null;
  return (
    <>
      {activeTag ? (
        <>
          <Type className="mb-2" style="sectionTitleLarge">
            New &amp; upvoted
          </Type>
          <FrontpagePostsList
            initialLimit={30}
            onlyTagId={activeTag._id}
            className="mb-10"
          />
        </>
      ) : (
        <>
          <Type className="mb-2" style="sectionTitleLarge">
            New &amp; upvoted
          </Type>
          <FrontpagePostsList
            initialLimit={11}
            excludeTagId={communityTagId}
            className="mb-10"
          />
          {communityTagId && (
            <>
              <Type className="mb-2" style="sectionTitleLarge">
                Posts tagged community
              </Type>
              <FrontpagePostsList
                initialLimit={5}
                onlyTagId={communityTagId}
                className="mb-10"
              />
            </>
          )}
          <Type className="mb-2" style="sectionTitleLarge">
            Quick takes
          </Type>
          <FrontpageQuickTakesList initialLimit={5} className="mb-10" />
          <Type className="mb-2" style="sectionTitleLarge">
            Popular comments
          </Type>
          <div className="mb-10">TODO: Popular comments list</div>
          <Type className="mb-2" style="sectionTitleLarge">
            Recent discussion
          </Type>
          <div>TODO: Recent discussions list</div>
        </>
      )}
    </>
  );
}

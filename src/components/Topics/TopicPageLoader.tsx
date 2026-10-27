import { notFound, permanentRedirect } from "next/navigation";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchTopicPageCached, getTopicPageLayout } from "@/lib/tags/tagPageQueries";
import {
  getTopicPostsSortedBy,
  type TopicPageTab,
} from "@/lib/tags/topicPageParams";
import { tagGetPageUrl } from "@/lib/tags/tagHelpers";
import StructuredData from "../StructuredData";
import CoreTopicLayout from "./CoreTopicLayout";
import NormalTopicLayout from "./NormalTopicLayout";

export default async function TopicPageLoader({
  slug,
  sortedByQuery,
  tab,
}: Readonly<{
  slug: string;
  sortedByQuery?: string;
  tab: TopicPageTab;
}>) {
  const currentUser = await getCurrentUser();
  const tag = await fetchTopicPageCached(currentUser, slug);
  if (!tag) {
    notFound();
  }
  if (slug !== tag.slug && tag.oldSlugs.includes(slug)) {
    permanentRedirect(tagGetPageUrl({ tag }));
  }
  const sortedBy = getTopicPostsSortedBy(sortedByQuery, tag.postsDefaultSortOrder);
  const layout = getTopicPageLayout(tag);
  return (
    <AnalyticsContext
      tagId={tag._id}
      tagName={tag.name}
      tagSlug={tag.slug}
      sortedBy={sortedBy}
    >
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: tag.name,
          url: tagGetPageUrl({ tag, isAbsolute: true }),
          mentions: tag.subTags.map((subTag) => ({
            "@type": "Thing",
            name: subTag.name,
            url: tagGetPageUrl({ tag: subTag, isAbsolute: true }),
          })),
          interactionStatistic: {
            "@type": "InteractionCounter",
            interactionType: { "@type": "WriteAction" },
            userInteractionCount: tag.postCount,
          },
        }}
      />
      {layout === "core" ? (
        <CoreTopicLayout
          tag={tag}
          currentUser={currentUser}
          sortedBy={sortedBy}
          tab={tab}
        />
      ) : (
        <NormalTopicLayout tag={tag} currentUser={currentUser} sortedBy={sortedBy} />
      )}
    </AnalyticsContext>
  );
}

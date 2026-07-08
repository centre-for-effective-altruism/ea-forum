import type { Metadata } from "next";
import {
  fetchFeaturedVideos,
  fetchHighlightsThisMonth,
  fetchHighlightsThisYear,
} from "@/lib/posts/postLists";
import {
  fetchFeaturedSequences,
  fetchTopicIntroSequences,
} from "@/lib/sequences/sequenceQueries";
import { fetchFeaturedCollections } from "@/lib/collections/collectionQueries";
import { getPostVideoAttributes } from "@/lib/posts/postVideos";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { getCurrentUser } from "@/lib/users/currentUser";
import CollectionCard from "@/components/FeaturedCards/CollectionCard";
import SequenceCard from "@/components/FeaturedCards/SequenceCard";
import TextLinkButton from "@/components/TextLinkButton";
import PostsList from "@/components/PostsList/PostsList";
import PostsItem from "@/components/PostsList/PostsItem";
import Link from "@/components/Link";
import Type from "@/components/Type";

const digestHref =
  "https://effectivealtruism.us8.list-manage.com/subscribe?u=52b028e7f799cca137ef74763&id=7457c7ff3e";

export const metadata: Metadata = {
  title: "Best of the Forum",
};

export default async function BestOfPage() {
  const currentUser = await getCurrentUser();
  const [
    highlightsThisYear,
    highlightsThisMonth,
    featuredCollections,
    featuredSequences,
    topicIntroSequences,
    featuredVideos,
  ] = await Promise.all([
    fetchHighlightsThisYear(currentUser),
    fetchHighlightsThisMonth(currentUser),
    fetchFeaturedCollections(),
    fetchFeaturedSequences(currentUser),
    fetchTopicIntroSequences(currentUser),
    fetchFeaturedVideos(currentUser),
  ]);
  return (
    <AnalyticsContext pageContext="eaBestOfPage">
      <div
        data-component="BestOfPage"
        className="
          w-[1500px] max-w-full flex flex-col lg:flex-row gap-20 px-8 pt-14 pb-24
        "
      >
        <div className="flex-[17_1_0%] flex flex-col gap-15">
          <div>
            <Type style="sectionTitleLarge" className="mb-4 text-[32px]!">
              Best of the Forum
            </Type>
            <Type style="bodyLarge">
              There are hundreds of posts on the EA Forum. This page collects a
              smaller number of excellent posts on a range of topics in effective
              altruism, selected by the EA Forum Team. You can{" "}
              <Link
                href={digestHref}
                className="text-primary-dark hover:text-primary"
              >
                also sign up for a weekly email
              </Link>{" "}
              with some of our favorite posts from the past week.
            </Type>
          </div>
          <div>
            <Type style="sectionTitleLarge">Featured collections</Type>
            <div className="flex items-center gap-4 my-4">
              {featuredCollections.map((collection) => (
                <CollectionCard collection={collection} key={collection._id} />
              ))}
              {featuredSequences.map((sequence) => (
                <SequenceCard sequence={sequence} key={sequence._id} />
              ))}
            </div>
            <TextLinkButton href="/library">View all collections</TextLinkButton>
          </div>
          <div>
            <Type style="sectionTitleLarge">Highlights this year</Type>
            <PostsList posts={highlightsThisYear} className="mt-4 mb-2" />
            <TextLinkButton href="/recommendations">View more</TextLinkButton>
          </div>
          <div>
            <Type style="sectionTitleLarge">Explore cause areas</Type>
            <div className="mt-4 grid grid-cols-3 gap-4">
              {topicIntroSequences.map((sequence) => (
                <SequenceCard sequence={sequence} key={sequence._id} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex-[10_1_0%] flex flex-col gap-15">
          <div>
            <Type style="sectionTitleLarge">Highlights this month</Type>
            <PostsList posts={highlightsThisMonth} className="mt-4 mb-2" />
            <TextLinkButton href="/recommendations">View more</TextLinkButton>
          </div>
          <div>
            <Type style="sectionTitleLarge">Featured videos</Type>
            <div className="mt-4 mb-2  space-y-4">
              {featuredVideos.map((post) => (
                <PostsItem
                  key={post._id}
                  post={post}
                  underNode={
                    <div className="p-3">
                      <iframe
                        {...getPostVideoAttributes(post)}
                        className="border-none w-full h-[183px] rounded"
                      />
                    </div>
                  }
                />
              ))}
            </div>
            <TextLinkButton href="/topics/video">View more</TextLinkButton>
          </div>
        </div>
      </div>
    </AnalyticsContext>
  );
}

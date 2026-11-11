import type { CSSProperties, ReactNode } from "react";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import {
  defaultFeaturedViewType,
  type PostsListViewType,
} from "@/lib/posts/postsListView";
import {
  marginalFundingWeekBorderColor,
  marginalFundingWeekListenUrl,
  marginalFundingWeekThemeColor,
} from "@/lib/marginalFundingWeek";
import Type from "../Type";
import Link from "../Link";
import clsx from "clsx";

export const MARGINAL_FUNDING_CARD_COUNT = 9;
export const MARGINAL_FUNDING_LIST_SKELETON_COUNT = 15;

export default function HomePageMarginalFundingTabLayout({
  explainerPost,
  posts,
  listSection,
  view = defaultFeaturedViewType,
}: Readonly<{
  explainerPost?: ReactNode;
  posts: ReactNode[];
  listSection?: ReactNode;
  view?: PostsListViewType;
}>) {
  const titleBox = (
    <div
      className={clsx(
        "flex flex-col justify-center gap-4 p-8 rounded",
        "border-1 border-gray-200 bg-surface-floating",
        view === "card" && "md:col-span-2",
      )}
    >
      <Type As="h2" style="postsPageTitle" className="max-w-[640px]">
        What would effective charities actually do with your money?
      </Type>
      <Type style="bodyLarge" className="text-gray-600 leading-[150%]">
        Highly effective charities are sharing their 2027 funding plans this week.
        Read their posts below and choose where to give. Short on time?{" "}
        <Link
          href={marginalFundingWeekListenUrl}
          openInNewTab
          className="text-primary underline hover:opacity-80"
        >
          Listen to the posts
        </Link>
        .
      </Type>
    </div>
  );

  return (
    <AnalyticsContext homePageTab="marginalFunding">
      <div
        data-component="HomePageMarginalFundingTabLayout"
        style={
          {
            "--marginal-funding-theme": marginalFundingWeekThemeColor,
            "--marginal-funding-border": marginalFundingWeekBorderColor,
          } as CSSProperties
        }
        className={clsx(
          "flex flex-col gap-4 pb-20",
          view === "list" && "max-w-[1000px]",
        )}
      >
        {view === "list" ? (
          titleBox
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-1">
            {titleBox}
            {explainerPost && <div className="h-full">{explainerPost}</div>}
            {posts.map((post, i) => (
              <div key={i} className="h-full">
                {post}
              </div>
            ))}
          </section>
        )}
        {listSection}
      </div>
    </AnalyticsContext>
  );
}

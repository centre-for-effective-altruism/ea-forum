import { Suspense, type CSSProperties, type ReactNode } from "react";
import { notFound } from "next/navigation";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchCachedSequenceEventPage } from "@/lib/sequences/sequenceEventQueries";
import type { SequenceEvent } from "@/lib/sequences/sequenceEvents";
import SequenceEventOptions from "./SequenceEventOptions";
import SequenceEventListItem from "./SequenceEventListItem";
import SequenceEventCard from "./SequenceEventCard";
import Loading from "../Loading";
import Type from "../Type";

const CARD_COUNT = 10;

const SequenceEventPageShell = ({
  event,
  children,
}: Readonly<{
  event: SequenceEvent;
  children: ReactNode;
}>) => (
  <div
    data-component="SequenceEventPage"
    style={
      {
        "--sequence-theme": event.themeColor,
        "--sequence-hover": event.hoverColor,
      } as CSSProperties
    }
    className="w-full min-h-screen bg-always-white text-always-black font-sans"
  >
    {children}
  </div>
);

const SequenceEventPageContent = async ({
  event,
}: Readonly<{
  event: SequenceEvent;
}>) => {
  const currentUser = await getCurrentUser();
  const data = await fetchCachedSequenceEventPage({
    currentUser,
    sequenceId: event.sequenceId,
    order: event.order,
  });
  if (!data) {
    notFound();
  }
  const { sequence, posts } = data;
  const cardPosts = posts.slice(0, CARD_COUNT);
  const listPosts = posts.slice(CARD_COUNT);
  return (
    <div
      data-component="SequenceEventPageContent"
      className="max-w-[1800px] mx-auto bg-always-black border-x border-always-black"
    >
      <div
        className="
          grid grid-cols-3 gap-px border-t border-always-black
          max-[960px]:grid-cols-2 max-[700px]:grid-cols-1
        "
      >
        <div
          className="
            col-span-2 flex flex-col gap-[50px] px-15 py-[65px]
            bg-(--sequence-theme) *:max-w-[min(700px,100%)]
            max-[700px]:col-span-1 max-[700px]:p-10 max-[600px]:px-5
          "
        >
          <SequenceEventOptions event={event} />
          <Type
            As="h1"
            style="postsPageTitle"
            className="
              text-[72px]! font-[600]! tracking-[-0.07em] leading-[110%]!
              max-[960px]:text-[56px]! max-[600px]:text-[48px]!
            "
          >
            {sequence.title}
          </Type>
          {sequence.html && (
            <div
              dangerouslySetInnerHTML={{ __html: sequence.html }}
              className="
                font-sans text-[19px] font-[500] tracking-[-0.02em] leading-[140%]
                [&_a]:underline [&_a]:font-[600] [&_a]:underline-offset-[3px]
              "
            />
          )}
        </div>
        {cardPosts.map((post) => (
          <SequenceEventCard key={post._id} post={post} />
        ))}
      </div>
      {listPosts.length > 0 && (
        <div
          className="
            grid grid-cols-[min-content_1fr] gap-y-px mt-px max-[960px]:grid-cols-1
          "
        >
          {listPosts.map((post) => (
            <SequenceEventListItem key={post._id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function SequenceEventPage({
  event,
}: Readonly<{
  event: SequenceEvent;
}>) {
  return (
    <AnalyticsContext pageContext={event.pageContext}>
      <SequenceEventPageShell event={event}>
        <Suspense
          fallback={
            <div className="pt-10">
              <Loading colorClassName="bg-always-black" />
            </div>
          }
        >
          <SequenceEventPageContent event={event} />
        </Suspense>
      </SequenceEventPageShell>
    </AnalyticsContext>
  );
}

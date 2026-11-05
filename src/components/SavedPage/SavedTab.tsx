import type { SavedTabData } from "./savedPageHelpers";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import BookmarkedCommentsList from "./BookmarkedCommentsList";
import BookmarkedPostsList from "./BookmarkedPostsList";
import ContinueReadingList from "./ContinueReadingList";
import SectionTitle from "../SectionTitle";

export default function SavedTab({
  continueReading,
  posts,
  comments,
}: Readonly<SavedTabData>) {
  return (
    <AnalyticsContext pageSectionContext="bookmarksTab">
      {continueReading.length > 0 && (
        <section>
          <SectionTitle title="Continue reading" rootClassName="mb-2" />
          <ContinueReadingList initialItems={continueReading} />
        </section>
      )}
      <section>
        <SectionTitle title="Saved posts" rootClassName="mb-2" />
        <BookmarkedPostsList initialPosts={posts} />
      </section>
      <section>
        <SectionTitle title="Saved comments & quick takes" rootClassName="mb-2" />
        <BookmarkedCommentsList initialComments={comments} />
      </section>
    </AnalyticsContext>
  );
}

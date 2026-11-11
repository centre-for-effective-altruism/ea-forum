import { redirect } from "next/navigation";
import type { NextSearchParams } from "@/lib/typeHelpers";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchKeywordAlertResults } from "@/lib/keywordAlerts/keywordAlertQueries";
import {
  DEFAULT_KEYWORD_START_DATE,
  parseKeywordDateRange,
} from "@/lib/keywordAlerts/keywordAlertHelpers";
import { formatLongDateWithTime } from "@/lib/timeUtils";
import { CommentsListProvider } from "../Comments/useCommentsList";
import CommentsList from "../Comments/CommentsList";
import PostsItem from "../PostsList/PostsItem";
import Type from "../Type";

const getSearchParam = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : undefined;

export default async function KeywordResultsContent({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ keyword: string }>;
  searchParams: Promise<NextSearchParams>;
}>) {
  const [{ keyword: encodedKeyword }, query, currentUser] = await Promise.all([
    params,
    searchParams,
    getCurrentUser(),
  ]);
  const keyword = decodeURIComponent(encodedKeyword);
  if (!keyword.trim()) {
    redirect("/keywords");
  }
  const { startDate, endDate } = parseKeywordDateRange({
    start: getSearchParam(query.start),
    end: getSearchParam(query.end),
  });
  const results = await fetchKeywordAlertResults({
    currentUser,
    keyword,
    startDate,
    endDate,
  });
  const isDefaultStart =
    startDate.getTime() === DEFAULT_KEYWORD_START_DATE.getTime();
  return (
    <div data-component="KeywordResultsContent" className="flex flex-col gap-4">
      <Type style="sectionTitleLarge" As="h1" className="break-words">
        Alerts for &quot;{keyword}&quot;
        {!isDefaultStart &&
          ` from ${formatLongDateWithTime(startDate, "UTC")} to ${formatLongDateWithTime(endDate, "UTC")} UTC`}
      </Type>
      {results.length === 0 ? (
        <Type className="text-gray-600">No results found</Type>
      ) : (
        <div className="flex flex-col gap-2">
          {results.map((result) =>
            result.type === "post" ? (
              <PostsItem key={result.post._id} post={result.post} />
            ) : (
              <CommentsListProvider
                key={result.comment._id}
                comments={[result.comment]}
                showPostTitle
              >
                <CommentsList />
              </CommentsListProvider>
            ),
          )}
        </div>
      )}
    </div>
  );
}

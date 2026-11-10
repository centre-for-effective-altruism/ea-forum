import type { NextSearchParams } from "@/lib/typeHelpers";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchKeywordAlerts } from "@/lib/keywordAlerts/keywordAlertQueries";
import KeywordAlertsManager from "./KeywordAlertsManager";
import Type from "../Type";

export default async function KeywordsPageContent({
  searchParams,
}: Readonly<{
  searchParams: Promise<NextSearchParams>;
}>) {
  const [currentUser, query] = await Promise.all([getCurrentUser(), searchParams]);
  if (!currentUser) {
    return (
      <Type className="text-gray-600">
        Please log in to manage your keyword alerts.
      </Type>
    );
  }
  const keywordAlerts = await fetchKeywordAlerts(currentUser._id);
  return (
    <KeywordAlertsManager
      initialKeywordAlerts={keywordAlerts}
      addKeyword={typeof query.add === "string" ? query.add : undefined}
    />
  );
}

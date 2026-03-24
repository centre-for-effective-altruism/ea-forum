import { AnalyticsContext } from "@/lib/analyticsEvents";
import ModerationPageContent from "@/components/ModerationPage/ModerationPageContent";

export default async function ModerationPage() {
  return (
    <AnalyticsContext pageContext="moderationLog">
      <ModerationPageContent />
    </AnalyticsContext>
  );
}

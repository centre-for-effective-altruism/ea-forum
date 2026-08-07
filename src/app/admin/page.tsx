import AdminPageSection from "@/components/Admin/AdminPageSection";
import Type from "@/components/Type";

export default async function AdminPage() {
  return (
    <div className="mx-auto w-max flex flex-col gap-6 mt-8">
      <Type style="commentsHeader" className="-mb-2">
        Admin console
      </Type>
      <AdminPageSection
        title="Moderation"
        items={[
          { title: "Moderation dashboard", href: "/admin/moderation" },
          { title: "Alt-accounts investigator", href: "/moderation/altAccounts" },
          { title: "Recently active users", href: "/admin/recentlyActiveUsers" },
          { title: "Moderation templates", href: "/admin/moderationTemplates" },
          { title: "ModGPT Dashboard", href: "/admin/modgpt" },
          { title: "Random user", href: "/admin/random-user" },
          { title: "Moderator comments", href: "/moderatorComments" },
          { title: "Moderation log", href: "/moderation" },
          { title: "Topics dashboard", href: "/topics/dashboard" },
          { title: "Swap user emails", href: "/admin/swap-user-emails" },
        ]}
      />
      <AdminPageSection
        title="Site admin"
        items={[
          { title: "Send event post email", href: "/admin/event-post-email" },
          {
            title: "Donation election candidates",
            href: "/admin/election-candidates",
          },
          { title: "Digests", href: "/admin/digests" },
          { title: "Featured queue", href: "/admin/featured" },
          { title: "Twitter tools", href: "/admin/twitter" },
          { title: "Spotlights", href: "/admin/spotlights" },
          { title: "Forum events", href: "/adminForumEvents" },
          { title: "Merge topics", href: "/admin/tagMerge" },
        ]}
      />
      <AdminPageSection
        title="Debug tools"
        items={[
          { title: "Email history", href: "/debug/emailHistory" },
          {
            title: "Notification email preview",
            href: "/debug/notificationEmailPreview",
          },
          { title: "Search test", href: "/searchTest" },
          { title: "Post list editor test", href: "/postListEditorTest" },
          { title: "Image upload test", href: "/imageUpload" },
          {
            title: "Recommendations explorer",
            href: "/admin/recommendationsSample",
          },
          { title: "View onboarding flow", href: "/admin/onboarding" },
        ]}
      />
    </div>
  );
}

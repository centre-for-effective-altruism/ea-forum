import ModerationTable from "@/components/ModerationPage/ModerationTable";
import Type from "@/components/Type";
import {
  migrationProgressAuditDate,
  migrationProgressTiers,
} from "./migrationProgressTiers";

export default function MigrationProgress() {
  return (
    <div
      data-component="MigrationProgress"
      className="max-w-full w-240 mx-auto my-12 px-4 flex flex-col gap-8"
    >
      <div className="flex flex-col gap-2">
        <Type style="sectionTitleLarge">Migration progress</Type>
        <Type style="bodySmall" className="text-gray-600">
          ForumMagnum routes that are active on the EA Forum but not yet implemented
          here, as of {migrationProgressAuditDate}. Complexity runs from 1 (a
          redirect or config change) to 5 (a large feature area) and is a rough
          estimate.
        </Type>
        <Type style="bodySmall" className="text-gray-600">
          Not listed: server and API endpoints (RSS, sitemap, crosspost and
          /api/eag-application-data), and /voting-portal while giving season is
          disabled. /people-directory has a page here but is not yet in
          newSitePatterns.
        </Type>
      </div>
      {migrationProgressTiers.map(({ complexity, title, description, routes }) => (
        <section key={complexity} className="flex flex-col gap-2">
          <Type style="sectionTitleSmall">
            {complexity} — {title}
          </Type>
          <Type style="bodySmall" className="text-gray-600">
            {description}
          </Type>
          <ModerationTable
            headers={["Route", "Notes"]}
            rows={routes.map(({ paths, notes, dropCandidate }) => [
              <div key="paths" className="flex flex-col">
                {paths.map((path) => (
                  <code key={path}>{path}</code>
                ))}
              </div>,
              <div key="notes" className="flex flex-col gap-1">
                {notes}
                {dropCandidate && (
                  <Type style="bodySmall" className="text-warning">
                    Candidate to drop
                  </Type>
                )}
              </div>,
            ])}
          />
        </section>
      ))}
    </div>
  );
}

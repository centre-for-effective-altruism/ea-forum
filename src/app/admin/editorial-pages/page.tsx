import type { Metadata } from "next";
import { fetchEditorialPages } from "@/lib/sequences/editorialPageQueries";
import {
  codeEditorialPages,
  type EditorialPage,
} from "@/lib/sequences/editorialPages";
import {
  ADMIN_EDITORIAL_PAGES_PATH,
  editorialPagePath,
  editorialPageRoutePath,
} from "@/lib/sequences/editorialPagePaths";
import Button from "@/components/Button";
import Link from "@/components/Link";
import Type from "@/components/Type";
import AdminEditorialPageColumn from "./AdminEditorialPageColumn";

export const metadata: Metadata = {
  title: "Editorial pages",
};

type PageRow = {
  key: string;
  title: string;
  href: string;
  themeColor: string;
  textColor: string;
  /** Absent for pages built in code, which can't be edited here */
  editHref?: string;
  note?: string;
};

const storedPageRow = (page: EditorialPage): PageRow => ({
  key: page.slug,
  title: page.title || page.slug,
  // An unpublished page only answers at the route the proxy rewrites to
  href: page.published
    ? editorialPagePath(page.slug)
    : editorialPageRoutePath(page.slug),
  themeColor: page.themeColor,
  textColor: page.textColor,
  editHref: `${ADMIN_EDITORIAL_PAGES_PATH}/${page.slug}`,
  note: page.published ? undefined : "unpublished",
});

export default async function AdminEditorialPagesPage() {
  const pages = await fetchEditorialPages();
  const rows: PageRow[] = [
    ...pages.map(storedPageRow),
    ...codeEditorialPages.map((page) => ({
      key: page.path,
      title: page.title,
      href: page.path,
      themeColor: page.themeColor,
      textColor: page.textColor,
      note: "built in code, ask a developer to change it",
    })),
  ];
  return (
    <AdminEditorialPageColumn>
      <div className="flex flex-col gap-6">
        <div>
          <Type style="sectionTitleLarge">Editorial pages</Type>
          <Type style="bodySmall" className="text-gray-600 mt-1">
            An editorial page is a standalone page for one sequence, in its own
            colours, at its own URL. The heading and blurb come from the sequence
            itself, so edit the sequence to change those.
          </Type>
        </div>
        <div>
          <Button href={`${ADMIN_EDITORIAL_PAGES_PATH}/new`}>
            Create new editorial page
          </Button>
        </div>
        <section className="flex flex-col gap-3">
          {rows.map(
            ({ key, title, href, themeColor, textColor, editHref, note }) => (
              <div
                key={key}
                className="
                flex items-center gap-4 border-1 border-gray-200 rounded
                bg-panel-background p-4
              "
              >
                <div
                  aria-hidden
                  style={{ background: themeColor, color: textColor }}
                  className="w-10 h-10 rounded shrink-0 flex items-center justify-center"
                >
                  Aa
                </div>
                <div className="grow min-w-0">
                  <Type style="bodyHeavy" className="truncate">
                    {title}
                  </Type>
                  <Type style="bodySmall" className="text-gray-600">
                    {href}
                    {note ? ` — ${note}` : ""}
                  </Type>
                </div>
                <Type style="bodyHeavy" className="flex gap-4 shrink-0">
                  <Link
                    href={href}
                    className="text-primary-dark hover:text-primary"
                    openInNewTab
                  >
                    View
                  </Link>
                  {editHref && (
                    <Link
                      href={editHref}
                      className="text-primary-dark hover:text-primary"
                    >
                      Edit
                    </Link>
                  )}
                </Type>
              </div>
            ),
          )}
        </section>
      </div>
    </AdminEditorialPageColumn>
  );
}

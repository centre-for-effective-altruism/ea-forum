import { getPostTranslations } from "@/lib/posts/postTranslations";
import Tooltip from "../Tooltip";
import Type from "../Type";
import Link from "../Link";

export default async function PostTranslations({
  postId,
  className,
}: Readonly<{
  postId: string;
  className?: string;
}>) {
  const translations = await getPostTranslations(postId);
  if (!translations.length) {
    return null;
  }
  const sorted = translations.toSorted((a, b) =>
    a.language.localeCompare(b.language),
  );
  return (
    <section
      data-component="PostTranslations"
      id="translations"
      className={className}
    >
      <Tooltip
        title={<Type style="bodySmall">Translations of this post</Type>}
        placement="top-start"
        className="mb-2"
      >
        <Type style="bodyMedium" className="cursor-default">
          Translations
        </Type>
      </Tooltip>
      <div className="flex flex-col gap-1">
        {sorted.map(({ url, title, language }) => (
          <Type key={url}>
            <Link href={url} openInNewTab>
              <span className="text-gray-600 uppercase mr-2">{language}</span>
              <Type As="span" style="bodyMedium" className="text-primary">
                {title}
              </Type>
            </Link>
          </Type>
        ))}
      </div>
    </section>
  );
}

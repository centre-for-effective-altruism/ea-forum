import Link from "../Link";
import Type from "../Type";

export default function AdminPageSection({
  title,
  items,
}: Readonly<{
  title: string;
  items: { title: string; href: string }[];
}>) {
  return (
    <section data-component="AdminPageSection">
      <Type style="sectionTitleLarge" className="mb-1">
        {title}
      </Type>
      <ul>
        {items.map(({ title, href }) => (
          <Type As="li" key={href} className="list-disc ml-3">
            <Link href={href} className="text-primary hover:opacity-50">
              {title}
            </Link>
          </Type>
        ))}
      </ul>
    </section>
  );
}

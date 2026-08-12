import Link from "./Link";

type LinkProps = Parameters<typeof Link>[0];

type MaybeLinkProps = Omit<LinkProps, "href"> & { href?: string | null };

export default function MaybeLink({ href, children, ...props }: MaybeLinkProps) {
  if (href) {
    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    );
  }
  return <>{children}</>;
}

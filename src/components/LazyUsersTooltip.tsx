import { ElementType, ReactNode, useCallback, useEffect, useState } from "react";
import { rpc } from "@/lib/rpc";
import { captureException } from "@sentry/nextjs";
import type { Placement } from "@floating-ui/react";
import type { UserBase } from "@/lib/users/userQueries";
import UsersTooltip from "./UsersTooltip";
import Tooltip from "./Tooltip";
import Loading from "./Loading";

export default function LazyUsersTooltip({
  userSlug,
  placement,
  As = "div",
  className,
  children,
}: Readonly<{
  userSlug: string | null;
  placement?: Placement;
  As?: ElementType;
  className?: string;
  children: ReactNode;
}>) {
  const [user, setUser] = useState<UserBase | null>(null);
  const [everHovered, setEverHovered] = useState(false);
  const onMouseEnter = useCallback(() => setEverHovered(true), []);

  // TODO: These results should be stored in a global cache to avoid refetching
  // the same user multiple times
  const refetch = useCallback(async () => {
    if (!userSlug) {
      setUser(null);
      return;
    }
    try {
      const result = await rpc.users.listBySlug({ slug: userSlug });
      setUser(result);
    } catch (e) {
      console.error(`Error fetching post ${userSlug}:`, e);
      captureException(e);
    }
  }, [userSlug]);

  useEffect(() => {
    setEverHovered(false);
  }, [userSlug]);

  useEffect(() => {
    if (everHovered) {
      void refetch();
    }
  }, [everHovered, refetch]);

  if (!userSlug) {
    return <>{children}</>;
  }

  if (user) {
    return (
      <UsersTooltip As={As} placement={placement} className={className} user={user}>
        {children}
      </UsersTooltip>
    );
  }

  return (
    <Tooltip
      As={As}
      placement={placement}
      className={className}
      tooltipClassName="bg-surface-floating! text-gray-900! p-0! shadow w-[270px]"
      title={<Loading />}
    >
      <As onMouseEnter={onMouseEnter}>{children}</As>
    </Tooltip>
  );
}

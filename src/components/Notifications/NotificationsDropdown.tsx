"use client";

import { useEffect, useState, ReactNode, useCallback, useMemo } from "react";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { rpc } from "@/lib/rpc";
import type { UserKarmaChanges } from "@/lib/users/karmaChangesTypes";
import type { NotificationDisplay as TNotificationDisplay } from "@/lib/notifications/notificationDisplayTypes";
import range from "lodash/range";
import debounce from "lodash/debounce";
import toast from "react-hot-toast";
import EllipsisVerticalIcon from "@heroicons/react/24/solid/EllipsisVerticalIcon";
import KarmaAndReactsNotifications from "./KarmaAndReactsNotifications";
import NotificationDisplaySkeleton from "./NotificationDisplaySkeleton";
import InfiniteLoadTrigger from "../InfiniteLoadTrigger";
import NotificationDisplay from "./NotificationDisplay";
import DropdownMenu from "../Dropdown/DropdownMenu";
import Dropdown from "../Dropdown/Dropdown";
import Type from "../Type";

const PAGE_SIZE = 20;

export default function NotificationsDropdown({
  karmaChanges,
  onOpen,
  className,
  children,
}: Readonly<{
  karmaChanges: UserKarmaChanges | null;
  onOpen?: () => void;
  className?: string;
  children: ReactNode;
}>) {
  const [markAsReadLoading, setMarkAsReadLoading] = useState(false);
  const [pages, setPages] = useState<(TNotificationDisplay[] | null)[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const loadPage = useCallback(async (pageIndex: number) => {
    try {
      setPages((prev) => {
        if (prev.length >= pageIndex) {
          return prev;
        }
        const next = [...prev];
        while (next.length <= pageIndex) {
          next.push(null);
        }
        return next;
      });

      const data = await rpc.notifications.list({
        offset: pageIndex * PAGE_SIZE,
        limit: PAGE_SIZE,
      });

      setPages((prev) => {
        const next = [...prev];
        while (next.length <= pageIndex) {
          next.push(null);
        }
        if (next[pageIndex] === null) {
          next[pageIndex] = data;
        }
        return next;
      });

      if (data.length < PAGE_SIZE) {
        setHasMore(false);
      }
    } catch (e) {
      toast.error("Failed to load notifications");
      console.error(e);
    }
  }, []);

  useEffect(() => {
    void loadPage(0);
  }, [loadPage]);

  const loadMore = useMemo(
    () =>
      debounce(() => {
        if (!hasMore) {
          return;
        }
        const nextPage = pages.length;
        void loadPage(nextPage);
      }, 1000),
    [hasMore, pages.length, loadPage],
  );

  useEffect(() => () => loadMore.cancel(), [loadMore]);

  const onToggleOpen = useCallback(
    (open: boolean) => {
      if (open) {
        void rpc.users.checkNotifications({
          hasKarmaChanges: !!karmaChanges,
          openedAt: new Date(),
          endDate: karmaChanges?.endDate ?? new Date(),
        });
        onOpen?.();
      }
    },
    [karmaChanges, onOpen],
  );

  const markAllAsRead = useCallback(async () => {
    setMarkAsReadLoading(true);
    await rpc.notifications.markAllAsRead();
    setMarkAsReadLoading(false);
    setPages([]);
  }, []);

  const isAnyLoading = pages.some((item) => !item);

  return (
    <AnalyticsContext pageSectionContext="notificationsPopover">
      <Dropdown
        className={className}
        onToggleOpen={onToggleOpen}
        placement="bottom"
        menu={
          <div
            data-component="NotificationsDropdown"
            className="
              bg-surface-floating rounded shadow-lg px-2 py-3 border border-gray-100
              w-[400px] max-w-full max-h-[90vh] overflow-y-auto
            "
          >
            <div className="px-2">
              <div className="flex">
                <Type className="text-[24px] font-[600] mb-6 grow">
                  Notifications
                </Type>
                <DropdownMenu
                  items={[
                    {
                      title: "Mark all as read",
                      onClick: markAllAsRead,
                      loading: markAsReadLoading,
                    },
                    {
                      title: "Keyword alerts",
                      href: "/keywords",
                    },
                    {
                      title: "Notification settings",
                      href: "/account?highlightField=auto_subscribe_to_my_posts",
                    },
                  ]}
                >
                  <button className="cursor-pointer hover:bg-item-hover rounded p-1">
                    <EllipsisVerticalIcon className="w-6" />
                  </button>
                </DropdownMenu>
              </div>
              <KarmaAndReactsNotifications
                karmaChanges={karmaChanges}
                className="mb-6"
              />
              <Type style="sectionTitleSmall" className="mb-4">
                Posts & comments
              </Type>
            </div>
            {pages.map((page, pageIndex) =>
              page
                ? page.map((notification) => (
                    <NotificationDisplay
                      key={notification._id}
                      notification={notification}
                    />
                  ))
                : range(PAGE_SIZE).map((i) => (
                    <NotificationDisplaySkeleton key={`${pageIndex}${i}`} />
                  )),
            )}
            {hasMore && !isAnyLoading && (
              <>
                <InfiniteLoadTrigger onTrigger={loadMore} />
                {range(PAGE_SIZE).map((i) => (
                  <NotificationDisplaySkeleton key={i} />
                ))}
              </>
            )}
            {!hasMore && (
              <Type className="text-gray-600 text-center mt-8 mb-6">
                No more notifications
              </Type>
            )}
          </div>
        }
      >
        {children}
      </Dropdown>
    </AnalyticsContext>
  );
}

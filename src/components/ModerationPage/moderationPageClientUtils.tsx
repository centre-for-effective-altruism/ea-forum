"use client";

import Link from "@/components/Link";
import Type from "@/components/Type";
import UsersName from "@/components/UsersName";
import { commentGetPageUrlFromIds } from "@/lib/comments/commentHelpers";
import { MODERATION_PAGE_SIZE } from "@/lib/moderation/moderationTransforms";
import type { UserSummary, PostSummary } from "@/lib/moderation/moderationTypes";
import type { SectionState } from "./moderationPageClientTypes";

export const MOD_ONLY_HEADER_CLASS = "bg-amber-600 text-always-white";

export const renderUserLink = (
  user: UserSummary | null | undefined,
  { showDashWhenMissing = false }: { showDashWhenMissing?: boolean } = {},
) => {
  if (!user && showDashWhenMissing) {
    return <span className="text-gray-600">—</span>;
  }

  return <UsersName user={user} />;
};

export const renderCommentLink = ({
  commentId,
  post,
}: {
  commentId: string;
  post: PostSummary | undefined;
}) => {
  if (!post) {
    return <span className="text-gray-600">—</span>;
  }
  return (
    <Link
      href={commentGetPageUrlFromIds({
        commentId,
        postId: post._id,
        postSlug: post.slug,
      })}
    >
      View comment
    </Link>
  );
};

export function TablePagination({
  page,
  pageSize = MODERATION_PAGE_SIZE,
  totalCount,
  isLoading,
  onPrev,
  onNext,
}: {
  page: number;
  pageSize?: number;
  totalCount: number;
  isLoading: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = totalCount === 0 ? 0 : Math.min(page * pageSize, totalCount);

  return (
    <div className="mt-2 flex items-center justify-between gap-3">
      <Type style="bodySmall" className="text-gray-600">
        {totalCount === 0
          ? "Showing 0 of 0"
          : `Showing ${start}-${end} of ${totalCount}`}
      </Type>
      {totalPages > 1 && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onPrev}
            disabled={page <= 1 || isLoading}
            className="text-primary text-sm hover:opacity-70 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <Type style="bodySmall" className="text-gray-600">
            Page {page} of {totalPages}
            {isLoading ? " (Loading...)" : ""}
          </Type>
          <button
            type="button"
            onClick={onNext}
            disabled={page >= totalPages || isLoading}
            className="text-primary text-sm hover:opacity-70 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export function SectionStatus({ loading, error }: SectionState) {
  if (error) {
    return (
      <Type style="bodySmall" className="mt-2 text-error">
        {error}
      </Type>
    );
  }
  if (loading) {
    return (
      <Type style="bodySmall" className="mt-2 text-gray-600">
        Loading...
      </Type>
    );
  }
  return null;
}

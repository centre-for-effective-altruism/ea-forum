import { SubmitEvent, useCallback, useEffect, useState } from "react";
import { captureException } from "@sentry/nextjs";
import toast from "react-hot-toast";
import { rpc } from "@/lib/rpc";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useCommentEditor } from "@/lib/hooks/useCommentEditor";
import { useQuickTakesTags } from "@/lib/hooks/useQuickTakesTags";
import type { CommentListItem } from "@/lib/comments/commentLists";
import type { TagBase } from "@/lib/tags/tagQueries";

export const useNewQuickTake = ({
  coreTags: coreTags_,
  onSuccess: onSuccess_,
}: {
  coreTags?: TagBase[];
  onSuccess?: (quickTake: CommentListItem) => void;
}) => {
  const { currentUser } = useCurrentUser();
  const [coreTags, setCoreTags] = useState(coreTags_);

  const onSuccess = useCallback(
    (quickTake: CommentListItem) => {
      toast.success("Quick take published");
      onSuccess_?.(quickTake);
    },
    [onSuccess_],
  );

  const { onSubmit: onSubmit_, ...editorProps } = useCommentEditor({
    shortform: true,
    onSuccess,
  });

  const tagProps = useQuickTakesTags(coreTags ?? []);

  const onSubmit = useCallback(
    async (ev: SubmitEvent<HTMLFormElement>) => {
      await onSubmit_(ev, {
        shortformFrontpage: tagProps.frontpage,
        relevantTagIds: tagProps.selectedTagIds,
      });
    },
    [onSubmit_, tagProps.frontpage, tagProps.selectedTagIds],
  );

  useEffect(() => {
    if (coreTags || !currentUser) {
      return;
    }
    void (async () => {
      try {
        const tags = await rpc.tags.listCore();
        setCoreTags(tags);
      } catch (e) {
        captureException(e);
        console.error("Error fetching core tags:", e);
      }
    })();
  }, [currentUser, coreTags]);

  return {
    editorProps: {
      ...editorProps,
      onSubmit,
    },
    tagProps,
  };
};

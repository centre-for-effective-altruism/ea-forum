import type { CurrentUser } from "../users/currentUser";
import { db } from "../db";
import { marginalFundingWeekSequenceId } from "../marginalFundingWeek";
import { createChapter, editChapter } from "../chapters/chapterMutations";

export const setMarginalFundingWeekSequencePosts = async (
  currentUser: CurrentUser,
  postIds: string[],
) => {
  const chapter = await db.query.chapters.findFirst({
    columns: { _id: true },
    where: { sequenceId: marginalFundingWeekSequenceId },
  });
  if (chapter) {
    await editChapter(currentUser, chapter._id, { postIds });
  } else {
    await createChapter(currentUser, marginalFundingWeekSequenceId, { postIds });
  }
};

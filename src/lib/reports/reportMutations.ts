import { commentGetPageUrl } from "../comments/commentHelpers";
import { db } from "../db";
import { postGetPageUrl } from "../posts/postsHelpers";
import { reports } from "../schema";
import { CurrentUser } from "../users/currentUser";
import { userCanDo } from "../users/userHelpers";
import { randomId } from "../utils/random";

export const createPostReport = async (
  currentUser: CurrentUser,
  postId: string,
  description: string,
) => {
  if (!userCanDo(currentUser, ["report.create", "reports.new"])) {
    throw new Error("You don't have permission to create reports");
  }

  const post = await db.query.posts.findFirst({
    columns: {
      _id: true,
      slug: true,
      isEvent: true,
      groupId: true,
    },
    where: {
      _id: postId,
    },
  });
  if (!post) {
    throw new Error("Post not found");
  }

  await db.insert(reports).values({
    _id: randomId(),
    userId: currentUser._id,
    postId,
    link: postGetPageUrl({ post }),
    description,
  });
};

export const createCommentReport = async (
  currentUser: CurrentUser,
  commentId: string,
  description: string,
) => {
  if (!userCanDo(currentUser, ["report.create", "reports.new"])) {
    throw new Error("You don't have permission to create reports");
  }

  const comment = await db.query.comments.findFirst({
    columns: {
      _id: true,
      tagCommentType: true,
    },
    with: {
      post: {
        columns: {
          _id: true,
          slug: true,
        },
      },
      tag: {
        columns: {
          slug: true,
        },
      },
    },
    where: {
      _id: commentId,
    },
  });
  if (!comment) {
    throw new Error("Comment not found");
  }

  await db.insert(reports).values({
    _id: randomId(),
    userId: currentUser._id,
    commentId,
    postId: comment.post?._id,
    link: commentGetPageUrl({ comment }),
    description,
  });
};

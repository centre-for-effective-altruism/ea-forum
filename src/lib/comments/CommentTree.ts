export type ThreadableCommentType = {
  _id: string;
  parentCommentId?: string | null;
  topLevelCommentId?: string | null;
  baseScore: number;
  postedAt: string;
};

export interface CommentTreeNode<T extends ThreadableCommentType> {
  comment: T;
  depth: number;
  /** True if this comment was created by an optimistic client-side update */
  isLocal: boolean;
  children: CommentTreeNode<T>[];
}

const updateDepths = <T extends ThreadableCommentType>(
  nodes: CommentTreeNode<T>[],
  depth = 0,
) => {
  for (const node of nodes) {
    node.depth = depth;
    updateDepths(node.children, depth + 1);
  }
};

/**
 * Sort the comments in the tree.
 * Local comments are always displayed first sorted newest to oldest.
 * Non-local comments are then sorted by karma, then date, then _id.
 */
const sortTreeNodes = <T extends ThreadableCommentType>(
  nodes: CommentTreeNode<T>[],
) => {
  nodes.sort((a, b) => {
    if (a.isLocal !== b.isLocal) {
      return a.isLocal ? -1 : 1;
    }
    if (!a.isLocal && !b.isLocal) {
      const scoreDiff = b.comment.baseScore - a.comment.baseScore;
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
    }
    const dateDiff =
      new Date(b.comment.postedAt).getTime() -
      new Date(a.comment.postedAt).getTime();
    if (dateDiff !== 0) {
      return dateDiff;
    }
    return b.comment._id.localeCompare(a.comment._id);
  });
  for (const node of nodes) {
    sortTreeNodes(node.children);
  }
};

/**
 * Given a set of comments with `parentCommentId`s in them, restructure as a
 * tree. Do this in a functional way: rather than edit a children property into
 * the existing comments (which requires cloning), like Vulcan-Starter does,
 * wrap the comments in an object with `item` and `children` fields. This
 * avoids cloning the comment object, which is good because the clone messes
 * with React's ability to detect whether updates are needed.
 */
export const commentsToCommentTree = <T extends ThreadableCommentType>(
  comments: T[],
  localComments: T[] = [],
): CommentTreeNode<T>[] => {
  const commentTreeNodes: CommentTreeNode<T>[] = [
    ...comments.map((comment) => ({
      comment,
      depth: 0,
      isLocal: false,
      children: [],
    })),
    ...localComments.map((comment) => ({
      comment,
      depth: 0,
      isLocal: true,
      children: [],
    })),
  ];

  const commentTreeNodesById: Record<string, CommentTreeNode<T>> = {};
  for (const node of commentTreeNodes) {
    commentTreeNodesById[node.comment._id] = node;
  }

  const roots: CommentTreeNode<T>[] = [];
  for (const commentNode of commentTreeNodes) {
    const parentId = commentNode.comment.parentCommentId;
    if (parentId) {
      const parentNode = commentTreeNodesById[parentId];
      if (parentNode) {
        parentNode.children.push(commentNode);
      } else {
        roots.push(commentNode);
      }
    } else {
      roots.push(commentNode);
    }
  }
  updateDepths(roots);
  sortTreeNodes(roots);
  return roots;
};

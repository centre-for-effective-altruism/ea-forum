export type ThreadableCommentType = {
  _id: string;
  parentCommentId?: string | null;
  topLevelCommentId?: string | null;
  baseScore: number;
};

export interface CommentTreeNode<T extends ThreadableCommentType> {
  comment: T;
  depth: number;
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

const sortByKarma = <T extends ThreadableCommentType>(
  nodes: CommentTreeNode<T>[],
) => {
  nodes.sort((a, b) => a.comment.baseScore - b.comment.baseScore);
  for (const node of nodes) {
    sortByKarma(node.children);
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
): CommentTreeNode<T>[] => {
  const commentTreeNodes: CommentTreeNode<T>[] = comments.map((comment) => ({
    comment,
    depth: 0,
    children: [],
  }));

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
  sortByKarma(roots);
  return roots;
};

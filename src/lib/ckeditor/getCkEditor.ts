import { isServer } from "../environment";

const getCkEditor = () => {
  if (isServer) {
    return {};
  }
  const {
    getCommentEditor,
    getPostEditor,
    getPostEditorCollaboration,
    // eslint-disable-next-line @typescript-eslint/no-require-imports
  } = require("../../../ckEditor/build/ckeditor");
  return { getCommentEditor, getPostEditor, getPostEditorCollaboration };
};

type CkEditorModule = ReturnType<typeof getCkEditor>;

let commentEditor: ReturnType<CkEditorModule["getCommentEditor"]> = null;
let postEditor: ReturnType<CkEditorModule["getPostEditor"]> = null;
let postEditorCollaborative: ReturnType<
  CkEditorModule["getPostEditorCollaboration"]
> = null;

export const getCkCommentEditor = () => {
  const { getCommentEditor } = getCkEditor();
  if (!commentEditor && getCommentEditor) {
    commentEditor = getCommentEditor();
  }
  return commentEditor;
};

export const getCkPostEditor = (isCollaborative: boolean) => {
  const { getPostEditor, getPostEditorCollaboration } = getCkEditor();
  if (isCollaborative) {
    if (!postEditorCollaborative && getPostEditorCollaboration) {
      postEditorCollaborative = getPostEditorCollaboration();
    }
    return postEditorCollaborative;
  } else {
    if (!postEditor && getPostEditor) {
      postEditor = getPostEditor();
    }
    return postEditor;
  }
};

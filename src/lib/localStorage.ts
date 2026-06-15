import type { CurrentUser } from "./users/currentUser";
import {
  adminEditors,
  EditorContents,
  EditorTypeString,
  nonAdminEditors,
} from "./ckeditor/editorHelpers";

export const getBrowserLocalStorage = () => {
  try {
    return "localStorage" in global && global.localStorage
      ? global.localStorage
      : null;
  } catch {
    // Some browsers don't have an accessible localStorage
    console.warn(
      "localStorage is unavailable; posts/comments will not be autosaved",
    );
    return null;
  }
};

/**
 * Return a wrapper around localStorage, with get, set, and reset functions
 * which handle the (document, field-name, prefix) => key mapping.
 */
export const getLSHandlers = (
  getLocalStorageId: (
    doc: { _id?: string; conversationId?: string },
    name: string,
  ) => { id: string; verify: boolean },
  doc: { _id?: string; conversationId?: string } | null | undefined,
  name: string,
  prefix: string,
) => {
  const { id } = getLocalStorageId(doc ?? {}, name);
  const prefixedId = prefix + id;
  return {
    get: () => {
      const ls = getBrowserLocalStorage();
      if (!ls) {
        return null;
      }
      try {
        const item = ls.getItem(prefixedId);
        return item ? JSON.parse(item) : null;
      } catch (e) {
        console.error("Failed reading from localStorage:", e);
        return null;
      }
    },
    set: (state: unknown) => {
      const ls = getBrowserLocalStorage();
      if (!ls) {
        return false;
      }
      try {
        ls.setItem(prefixedId, JSON.stringify(state));
      } catch (e) {
        console.error("Failed writing to localStorage:", e);
        return false;
      }
      return true;
    },
    reset: () => {
      const ls = getBrowserLocalStorage();
      if (!ls) {
        return;
      }
      try {
        ls.removeItem(prefixedId);
      } catch (e) {
        console.error("Failed writing to localStorage:", e);
      }
    },
  };
};

type LocalStorageHandlers = ReturnType<typeof getLSHandlers>;

const restorableStateHasMetadata = (savedState: EditorContents | string) =>
  typeof savedState === "object";

export const getRestorableDocumentFromLocalStorage = (
  currentUser: CurrentUser | null,
  getLocalStorageHandlers: (editorType: EditorTypeString) => LocalStorageHandlers,
): EditorContents | null => {
  const editors = currentUser?.isAdmin ? adminEditors : nonAdminEditors;
  for (const editorType of editors) {
    const savedState = getLocalStorageHandlers(editorType).get();
    if (savedState) {
      if (restorableStateHasMetadata(savedState)) {
        return savedState;
      }
      return { type: editorType, data: savedState };
    }
  }
  return null;
};

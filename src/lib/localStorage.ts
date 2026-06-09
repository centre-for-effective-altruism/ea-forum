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

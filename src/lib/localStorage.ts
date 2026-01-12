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

import { useEffect } from "react";

export const useGlobalKeydown = (
  keyboardHandlerFn: (this: Document, ev: KeyboardEvent) => void,
) => {
  useEffect(() => {
    document.addEventListener("keydown", keyboardHandlerFn);
    return () => document.removeEventListener("keydown", keyboardHandlerFn);
  }, [keyboardHandlerFn]);
};

export const useOnSearchHotkey = (keyboardHandlerFn: () => void) => {
  useGlobalKeydown((event) => {
    // TODO: Is this Cmd+F/Alt+F/etc?
    const F_Key = "F".charCodeAt(0);
    if ((event.metaKey || event.ctrlKey) && event.keyCode === F_Key) {
      keyboardHandlerFn();
    }
  });
};

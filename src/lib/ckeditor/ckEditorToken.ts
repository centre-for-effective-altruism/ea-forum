import { LRUCache } from "lru-cache";
import type { EditorCollectionName } from "./editorSettings";

// This cache helps avoid multiple network load times when requesting
// tokens in quick succession.
// CkEditor tokens are valid for 24 hours, so we use a 12 hour TTL.
const cache = new LRUCache<string, string>({
  ttl: 1000 * 60 * 60 * 12,
  ttlAutopurge: true,
});

export const generateCkEditorTokenRequest = (
  collectionName: EditorCollectionName,
  fieldName: string,
  documentId?: string,
  userId?: string,
  formType?: string,
  linkSharingKey?: string,
) => {
  return async () => {
    const cacheKey = `${collectionName}-${fieldName}-${documentId}-${userId}-${formType}-${linkSharingKey}`;
    const cachedToken = cache.get(cacheKey);
    if (cachedToken) {
      return cachedToken;
    }

    const headers = new Headers({
      "collection-name": collectionName,
      "field-name": fieldName,
    });
    if (linkSharingKey) {
      headers.set("link-sharing-key", linkSharingKey);
    }
    if (documentId) {
      headers.set("document-id", documentId);
    }
    if (userId) {
      headers.set("user-id", userId);
    }
    if (formType) {
      headers.set("form-type", formType);
    }

    let response: Response;
    try {
      response = await fetch("/api/ckeditor-token", {
        method: "POST",
        headers,
      });
    } catch (err) {
      // TODO Sentry
      console.error("CkEditor token network error:", err);
      throw new Error("CkEditor token network error");
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("CkEditor token error:", errorText);
      throw new Error("Cannot download a new token");
    }

    const token = await response.text();
    cache.set(cacheKey, token);
    return token;
  };
};

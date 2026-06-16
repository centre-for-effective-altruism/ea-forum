declare global {
  interface Window {
    google_tag_manager?: unknown;
    ga?: {
      create?: unknown;
    };
    dataLayer?: unknown[];
    tabId?: string;
  }
}

export {};

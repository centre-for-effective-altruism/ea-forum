import { captureException } from "@sentry/nextjs";
import { z } from "zod/v4";

const postTranslationSchema = z.looseObject({
  url: z.string(),
  title: z.string(),
  language: z.string(),
});

const translationsDataSchema = z.record(z.string(), z.array(postTranslationSchema));

export type PostTranslation = z.infer<typeof postTranslationSchema>;
type TranslationsData = z.infer<typeof translationsDataSchema>;

const TRANSLATIONS_API_URL = "https://ea.international/api/translations/forummagnum";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 1 week

let cachedTranslationsData: TranslationsData | null = null;
let cacheExpiry = 0;

const fetchTranslationsData = async (): Promise<TranslationsData | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000); // 15s timeout
  try {
    const response = await fetch(TRANSLATIONS_API_URL, {
      headers: { "User-Agent": "ForumMagnum/2.1" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Post translations API returned ${response.status}`);
    }
    const json = await response.json();
    const parsed = translationsDataSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error(
        `Post translations API returned invalid data: ${parsed.error}`,
      );
    }
    return parsed.data;
  } catch (error) {
    console.error("Error fetching post translations:", error);
    captureException(error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

const getTranslationsData = async (): Promise<TranslationsData | null> => {
  const now = Date.now();
  if (cachedTranslationsData && now < cacheExpiry) {
    return cachedTranslationsData;
  }
  const data = await fetchTranslationsData();
  if (data) {
    cachedTranslationsData = data;
    cacheExpiry = now + CACHE_TTL_MS;
  }
  return data;
};

export const getPostTranslations = async (
  postId: string,
): Promise<PostTranslation[]> => {
  const data = await getTranslationsData();
  return data?.[postId] ?? [];
};

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
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 1 week

const fetchTranslationsData = async (): Promise<TranslationsData | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000); // 15s timeout
  try {
    const response = await fetch(TRANSLATIONS_API_URL, {
      headers: { "User-Agent": "ForumMagnum/2.1" },
      signal: controller.signal,
      next: { revalidate: CACHE_TTL_SECONDS },
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

export const getPostTranslations = async (
  postId: string,
): Promise<PostTranslation[]> => {
  const data = await fetchTranslationsData();
  return data?.[postId] ?? [];
};

import { ApiError, requestHandler } from "@/lib/requestHandler";
import { fetchFrontpagePostsList } from "@/lib/posts/postLists";

const parsePositiveInt = (
  value: string | null,
  defaultValue: number,
  errorMessage: string,
) => {
  if (!value) {
    return defaultValue;
  }
  const parsed = parseInt(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new ApiError(400, errorMessage);
  }
  return parsed;
};

export const GET = requestHandler(async ({ url, currentUser }) => {
  const view = url.searchParams.get("view");
  const offset = parsePositiveInt(
    url.searchParams.get("offset"),
    0,
    "Invalid offset",
  );
  const limit = parsePositiveInt(url.searchParams.get("limit"), 10, "Invalid limit");
  const excludeTagId = url.searchParams.get("excludeTagId") ?? undefined;
  const onlyTagId = url.searchParams.get("onlyTagId") ?? undefined;

  if (view !== "frontpage") {
    throw new ApiError(400, "Invalid view");
  }

  const posts = await fetchFrontpagePostsList({
    currentUserId: currentUser?._id ?? null,
    offset,
    limit,
    excludeTagId,
    onlyTagId,
  });

  return Response.json({ posts }, { status: 200 });
});

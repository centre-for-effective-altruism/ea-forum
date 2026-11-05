import TextLinkButton from "../TextLinkButton";

export default function LoadMoreButton({
  canLoadMore,
  loading,
  onLoadMore,
}: Readonly<{
  canLoadMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}>) {
  if (!canLoadMore) {
    return null;
  }
  return (
    <TextLinkButton
      variant="primary"
      onClick={onLoadMore}
      disabled={loading}
      className="self-start mt-2"
    >
      Load more
    </TextLinkButton>
  );
}

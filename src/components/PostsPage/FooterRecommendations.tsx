import Type from "../Type";

export default async function FooterRecommendations({ postId }: { postId: string }) {
  // TODO
  void postId;
  return (
    <div className="w-full bg-(--background) pt-15 pb-20">
      <div className="w-[698px] max-w-full mx-auto">
        {/*
        {post.user && (
          <Type style="sectionTitleLarge" className="mb-2">
            More from {post.user.displayName}
          </Type>
        )}
          */}
        <Type style="sectionTitleLarge" className="mb-2">
          Curated and popular this week
        </Type>
        <Type style="sectionTitleLarge" className="mb-2">
          {/* TODO pick a tag */}
          Recent opportunities in Cause prioritization
        </Type>
      </div>
    </div>
  );
}

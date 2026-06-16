import type { Metadata } from "next";
import { generatePostMetadata } from "@/lib/posts/postMetadata";
import { getCurrentUser } from "@/lib/users/currentUser";
import PostsPage from "@/components/PostsPage/PostsPage";

type PostPageProps = {
  params: Promise<{ _id: string }>;
};

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const [currentUser, { _id }] = await Promise.all([getCurrentUser(), params]);
  return await generatePostMetadata(currentUser, _id);
}

export default async function PostPage({ params }: PostPageProps) {
  const { _id } = await params;
  return <PostsPage postId={_id} />;
}

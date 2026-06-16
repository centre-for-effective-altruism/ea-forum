import type { Metadata } from "next";
import { generatePostMetadata } from "@/lib/posts/postMetadata";
import { getCurrentUser } from "@/lib/users/currentUser";
import PostsPage from "@/components/PostsPage/PostsPage";

type SequencePostPageProps = {
  params: Promise<{ postId: string; sequenceId: string }>;
};

export async function generateMetadata({
  params,
}: SequencePostPageProps): Promise<Metadata> {
  const [currentUser, { postId }] = await Promise.all([getCurrentUser(), params]);
  return await generatePostMetadata(currentUser, postId);
}

export default async function SequencePostPage({ params }: SequencePostPageProps) {
  const { postId, sequenceId } = await params;
  return <PostsPage postId={postId} sequenceId={sequenceId} />;
}

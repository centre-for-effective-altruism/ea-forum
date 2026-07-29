import type { Metadata } from "next";
import { fetchFeaturedQueue } from "@/lib/featuredQueue/featuredQueueQueries";
import FeaturedQueuePage from "@/components/FeaturedQueuePage/FeaturedQueuePage";

export const metadata: Metadata = {
  title: "Featured queue",
};

export default async function AdminFeaturedQueuePage() {
  const posts = await fetchFeaturedQueue();
  return <FeaturedQueuePage posts={posts} />;
}

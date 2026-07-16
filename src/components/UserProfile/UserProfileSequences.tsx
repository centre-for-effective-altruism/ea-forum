import { fetchUserProfileSequences } from "@/lib/sequences/sequenceQueries";
import { fetchUserProfile } from "@/lib/users/userQueries";
import { getCurrentUser } from "@/lib/users/currentUser";
import SequenceCard from "../FeaturedCards/SequenceCard";
import Type from "../Type";

export default async function UserProfileSequences({
  slug,
}: Readonly<{
  slug: string;
}>) {
  const currentUser = await getCurrentUser();
  const user = await fetchUserProfile(currentUser, slug);
  if (!user?.sequenceCount) {
    return null;
  }
  const sequences = await fetchUserProfileSequences({ userId: user._id });
  if (!sequences.length) {
    return null;
  }
  return (
    <section
      data-component="UserProfileSequences"
      id="sequences"
      className="bg-surface-floating rounded p-6"
    >
      <Type style="sectionTitleLarge" className="mb-4">
        Sequences <span className="text-gray-600">{user.sequenceCount}</span>
      </Type>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {sequences.map((sequence) => (
          <SequenceCard key={sequence._id} sequence={sequence} />
        ))}
      </div>
    </section>
  );
}

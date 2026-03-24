import { useEffect, useState } from "react";
import { captureException } from "@sentry/nextjs";
import { rpc } from "@/lib/rpc";
import type { OnboardingTag } from "@/lib/tags/tagQueries";
import type { OnboardingUser } from "@/lib/users/userQueries";

export const useSuggestedSubscriptions = () => {
  const [tags, setTags] = useState<OnboardingTag[]>([]);
  const [users, setUsers] = useState<OnboardingUser[]>([]);
  useEffect(() => {
    void (async () => {
      try {
        const tags = await rpc.tags.fetchOnboardingTags();
        setTags(tags);
      } catch (e) {
        captureException(e);
        console.error("Error fetching onboarding tags:", e);
      }
    })();
    void (async () => {
      try {
        const users = await rpc.users.fetchOnboardingUsers();
        setUsers(users);
      } catch (e) {
        captureException(e);
        console.error("Error fetching onboarding users:", e);
      }
    })();
  }, []);
  return { tags, users };
};

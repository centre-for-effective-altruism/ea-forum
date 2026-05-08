import { db } from "../db";
import type { Post } from "../schema";

export type Rsvp = {
  name: string;
  email?: string;
  nonPublic?: boolean;
  response: "yes" | "maybe" | "no";
  userId?: string | null;
  createdAt?: string;
};

export const rsvpToText = (rsvp: Rsvp) => {
  return {
    yes: "Going",
    maybe: "Maybe",
    no: "Can't Go",
  }[rsvp.response];
};

const getEmailFromRsvp = async ({ email, userId }: Rsvp): Promise<string | null> => {
  if (email) {
    // Email is free text
    const matches = email.match(
      /(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/,
    );
    const foundEmail = matches?.[0];
    if (foundEmail) {
      return foundEmail ?? null;
    }
  }
  if (userId) {
    const user = await db.query.users.findFirst({
      columns: {
        email: true,
      },
      where: {
        _id: userId,
      },
    });
    if (user) {
      return user.email;
    }
  }
  return null;
};

export const getUsersToNotifyAboutEvent = async (
  post: Pick<Post, "rsvps">,
): Promise<{ rsvp: Rsvp; userId: string | null; email: string | null }[]> => {
  if (!post.rsvps || !post.rsvps.length) {
    return [];
  }
  return await Promise.all(
    post.rsvps
      .filter((r: Rsvp) => r.response !== "no")
      .map(async (r: Rsvp) => ({
        rsvp: r,
        userId: r.userId ?? null,
        email: await getEmailFromRsvp(r),
      })),
  );
};

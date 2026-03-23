import md5 from "md5";
import { z } from "zod/v4";
import { db } from "./db";
import { users } from "./schema";
import { userGetLocation } from "./users/userHelpers";
import { updateWithFieldChanges } from "./fieldChanges";
import type { CurrentUser } from "./users/currentUser";

export const mailchimpListSchema = z.enum(["eaForum", "digest", "newsletter"]);

type MailchimpList = z.infer<typeof mailchimpListSchema>;

const listIds: Record<MailchimpList, string | undefined> = {
  eaForum: process.env.MAILCHIMP_EA_FORUM_LIST_ID,
  digest: process.env.MAILCHIMP_DIGEST_LIST_ID,
  newsletter: process.env.MAILCHIMP_EA_NEWSLETTER_LIST_ID,
};

type MailchimpStatus = "subscribed" | "unsubscribed";

export const updateMailchimpSubscription = async ({
  list,
  status,
  email,
  displayName,
  location,
}: {
  list: MailchimpList;
  status: MailchimpStatus;
  email: string;
  displayName?: string;
  location?: { longitude: number; latitude: number };
}) => {
  const listId = listIds[list];
  if (!listId) {
    throw new Error("Mailchimp list id not configured");
  }

  const apiKey = process.env.MAILCHIMP_API_KEY;
  if (!apiKey) {
    throw new Error("Mailchimp api key not configured");
  }

  const emailHash = md5(email.toLowerCase());

  const response = await fetch(
    `https://us8.api.mailchimp.com/3.0/lists/${listId}/members/${emailHash}`,
    {
      method: "PUT",
      body: JSON.stringify({
        email_address: email,
        email_type: "html",
        location,
        merge_fields: {
          SOURCE: "EAForum",
          FNAME: displayName,
        },
        status,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `API_KEY ${apiKey}`,
      },
    },
  );
  if (response.status !== 200) {
    const json = await response.json();
    const details = String(json.detail || response?.statusText || "Unknown error");
    throw new Error(`Error subscribing: ${details}`);
  }
};

export const updateUserMailchimpSubscription = async ({
  user,
  list,
  status,
}: {
  user: CurrentUser;
  list: MailchimpList;
  status: MailchimpStatus;
}) => {
  const email = user.email;
  if (!email) {
    throw new Error("User email not known");
  }

  const { lat: latitude, lng: longitude, known } = userGetLocation(user);
  await updateMailchimpSubscription({
    list,
    status,
    email,
    displayName: user.displayName,
    location: known ? { latitude, longitude } : undefined,
  });

  const update =
    status === "subscribed"
      ? { subscribedToDigest: true, unsubscribeFromAll: false }
      : { subscribedToDigest: false };
  await updateWithFieldChanges(db, user, users, user._id, update);
};

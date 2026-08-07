"use client";

import { FC, useCallback, useEffect, useState } from "react";
import { captureException } from "@sentry/nextjs";
import { userGetProfileUrl } from "@/lib/users/userHelpers";
import { rpc } from "@/lib/rpc";
import type { UserBase } from "@/lib/users/userQueries";
import toast from "react-hot-toast";
import Input from "../Forms/Input";
import Button from "../Button";
import Type from "../Type";
import Link from "../Link";

const UserDisplay: FC<{ user: UserBase }> = ({ user }) => (
  <Type style="bodyMedium">
    <Link
      href={userGetProfileUrl({ user })}
      openInNewTab
      className="text-primary hover:text-primary-dark"
    >
      {user.displayName}
    </Link>
  </Type>
);

export default function SwapUserEmails() {
  const [userId1, setUserId1] = useState("");
  const [userId2, setUserId2] = useState("");

  const [user1, setUser1] = useState<UserBase | null>(null);
  const [user2, setUser2] = useState<UserBase | null>(null);

  const refetch = useCallback(async () => {
    const userIds = [userId1, userId2].filter(Boolean) as string[];
    if (!userIds.length) {
      setUser1(null);
      setUser2(null);
      return;
    }
    const result = await rpc.users.listByIds({ userIds });
    setUser1(result[userId1] ?? null);
    setUser2(result[userId2] ?? null);
  }, [userId1, userId2]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const onSubmit = useCallback(async () => {
    const toastId = toast.loading("Swaping emails...");
    try {
      await rpc.users.swapEmails({ userId1, userId2 });
      toast.success("Emails swapped");
    } catch (e) {
      console.error(e);
      captureException(e);
      toast.error(e instanceof Error ? e.message : String(e));
    }
    toast.dismiss(toastId);
  }, [userId1, userId2]);

  return (
    <div data-component="SwapUserEmails" className="flex flex-col gap-6">
      <Type style="sectionTitleLarge">Swap user emails</Type>
      <Input value={userId1} setValue={setUserId1} placeholder="User ID 1" />
      {user1 && <UserDisplay user={user1} />}
      <Input value={userId2} setValue={setUserId2} placeholder="User ID 2" />
      {user2 && <UserDisplay user={user2} />}
      <div>
        <Button disabled={!user1 || !user2} onClick={onSubmit}>
          Swap emails
        </Button>
      </div>
    </div>
  );
}

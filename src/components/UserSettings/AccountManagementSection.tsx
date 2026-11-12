"use client";

import { useState } from "react";
import { captureException } from "@sentry/nextjs";
import toast from "react-hot-toast";
import { rpc } from "@/lib/rpc";
import { addTime, formatLongDate } from "@/lib/timeUtils";
import { accountDeletionCoolingOffDays } from "@/lib/users/userSettings";
import type { UserSettingsPageData } from "@/lib/users/userSettingsQueries";
import CollapsibleFormGroup from "../Forms/CollapsibleFormGroup";
import ConfirmationPopover from "./ConfirmationPopover";
import Button from "../Button";
import Link from "../Link";
import Type from "../Type";

const getDeletionDate = (requestedAt: Date) =>
  addTime(requestedAt, accountDeletionCoolingOffDays, "days");

export default function AccountManagementSection({
  user,
}: Readonly<{
  user: UserSettingsPageData["user"];
}>) {
  const [deleted, setDeleted] = useState(user.deleted);
  const [deletionRequestedAt, setDeletionRequestedAt] = useState(
    user.permanentDeletionRequestedAt,
  );
  const [loading, setLoading] = useState<"deactivate" | "delete" | null>(null);
  const [confirmingDeletion, setConfirmingDeletion] = useState(false);

  const run = async (action: "deactivate" | "delete", fn: () => Promise<void>) => {
    setLoading(action);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      captureException(e);
      toast.error(
        <Type>{e instanceof Error ? e.message : "Something went wrong"}</Type>,
      );
    }
    setLoading(null);
  };

  const toggleDeactivated = () =>
    run("deactivate", async () => {
      await rpc.users.setDeactivated({ userId: user._id, deactivated: !deleted });
      setDeleted(!deleted);
      toast.success(
        <Type>{deleted ? "Account reactivated" : "Account deactivated"}</Type>,
      );
    });

  const setDeletionRequested = (requested: boolean) =>
    run("delete", async () => {
      await rpc.users.setDeletionRequested({ userId: user._id, requested });
      setDeletionRequestedAt(requested ? new Date() : null);
      if (requested) {
        setDeleted(true);
      }
      toast.success(
        <Type>
          {requested ? "Account deletion requested" : "Deletion request revoked"}
        </Type>,
      );
    });

  const deletionDate = deletionRequestedAt
    ? getDeletionDate(deletionRequestedAt)
    : null;

  return (
    <CollapsibleFormGroup title="Deactivate account">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 items-start">
          <Type style="bodySmall" className="text-gray-800">
            Deactivating your account means your posts and comments will be listed as
            &lsquo;[Anonymous]&rsquo;, and your user profile won&apos;t be
            accessible. This can be reversed at any time.
          </Type>
          <Button
            variant="greyFilled"
            onClick={toggleDeactivated}
            disabled={!!deletionRequestedAt && deleted}
            loading={loading === "deactivate"}
          >
            {deleted ? "Reactivate account" : "Deactivate account"}
          </Button>
        </div>
        <div className="flex flex-col gap-3 items-start">
          <Type style="bodySmall" className="text-gray-800">
            Deleting your account will permanently remove your data from the Forum
            and associated services. You will be asked for confirmation before
            continuing.
          </Type>
          {deletionDate && (
            <Type style="bodySmall" className="text-error font-[600]">
              Your account will be permanently deleted{" "}
              {deletionDate > new Date()
                ? `on ${formatLongDate(deletionDate)}`
                : "within an hour"}
            </Type>
          )}
          <Button
            variant="greyOutlined"
            onClick={() =>
              deletionRequestedAt
                ? void setDeletionRequested(false)
                : setConfirmingDeletion(true)
            }
            loading={loading === "delete"}
            className="text-error border-error!"
          >
            {deletionRequestedAt ? "Revoke deletion request" : "Delete account"}
          </Button>
        </div>
      </div>
      <ConfirmationPopover
        open={confirmingDeletion}
        title="Confirm account deletion"
        onConfirm={() => void setDeletionRequested(true)}
        onClose={() => setConfirmingDeletion(false)}
      >
        <Type style="bodySmall">
          Your account will be deactivated, and you will be unsubscribed from the
          Forum Digest. You will be able to log in and reverse this within{" "}
          <strong>{accountDeletionCoolingOffDays} days</strong>, after which your
          account and any associated data will be permanently deleted from our
          servers.
        </Type>
        <Type style="bodySmall">
          Note: By default your posts and comments will remain and be listed as
          &lsquo;[Anonymous]&rsquo;, please{" "}
          <Link href="/contact" className="text-primary hover:underline">
            contact us
          </Link>{" "}
          if you would like these to be removed.
        </Type>
      </ConfirmationPopover>
    </CollapsibleFormGroup>
  );
}

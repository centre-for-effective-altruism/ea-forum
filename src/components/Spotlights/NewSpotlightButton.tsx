"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { captureException } from "@sentry/nextjs";
import { rpc } from "@/lib/rpc";
import toast from "react-hot-toast";
import Button from "../Button";

export default function NewSpotlightButton() {
  const router = useRouter();

  const onClick = useCallback(async () => {
    const toastId = toast.loading("Creating new spotlight...");
    try {
      const spotlightId = await rpc.spotlights.create();
      router.push(`/admin/spotlights/${spotlightId}`);
    } catch (e) {
      console.error(e);
      captureException(e);
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
    toast.dismiss(toastId);
  }, [router]);

  return (
    <div data-component="NewSpotlightButton">
      <Button onClick={onClick}>Create new spotlight</Button>
    </div>
  );
}

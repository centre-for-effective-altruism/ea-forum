import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";

const getCurrentClientIdUnchached = async (): Promise<string> => {
  const cookieStore = await cookies();
  // TODO: Handle case where client ID doesn't exists (should never happen?)
  return cookieStore.get("clientId")?.value ?? "";
};

export const getCurrentClientId = cache(getCurrentClientIdUnchached);

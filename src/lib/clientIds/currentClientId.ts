import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { CLIENT_ID_COOKIE } from "./clientIdHelpers";

const getCurrentClientIdUnchached = async (): Promise<string> => {
  const cookieStore = await cookies();
  return cookieStore.get(CLIENT_ID_COOKIE)?.value ?? "";
};

export const getCurrentClientId = cache(getCurrentClientIdUnchached);

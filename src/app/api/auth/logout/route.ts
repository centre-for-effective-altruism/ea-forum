import { cookies } from "next/headers";
import { LOGIN_TOKEN_COOKIE_NAME } from "@/lib/authHelpers";

export async function POST(_request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete(LOGIN_TOKEN_COOKIE_NAME);
  return Response.json({ message: "Logged out" }, { status: 200 });
}

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/users/currentUser";
import { userGetEditUrl } from "@/lib/users/userHelpers";
import Type from "@/components/Type";

export const instant = false;

export default async function AccountPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const [currentUser, query] = await Promise.all([getCurrentUser(), searchParams]);
  if (!currentUser) {
    return (
      <Type className="w-[765px] max-w-full mx-auto pt-6 px-4 text-gray-600">
        Please log in to manage your account settings.
      </Type>
    );
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const item of [value ?? []].flat()) {
      params.append(key, item);
    }
  }
  const search = params.size ? `?${params}` : "";
  redirect(`${userGetEditUrl({ user: currentUser })}${search}`);
}

import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchUserSettingsPageData } from "@/lib/users/userSettingsQueries";
import UserSettingsForm from "./UserSettingsForm";
import Type from "../Type";

export default async function UserSettingsContent({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) {
  const [currentUser, { slug }] = await Promise.all([getCurrentUser(), params]);
  if (!currentUser) {
    return (
      <Type className="text-gray-600">
        Please log in to manage your account settings.
      </Type>
    );
  }
  const data = await fetchUserSettingsPageData(
    currentUser,
    decodeURIComponent(slug),
  );
  if (!data) {
    notFound();
  }
  return <UserSettingsForm data={data} />;
}

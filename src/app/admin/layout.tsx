import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/users/currentUser";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isAdmin) {
    notFound();
  }
  return children;
}

import type { Metadata } from "next";
import { newEditorialPage } from "@/lib/sequences/editorialPages";
import EditEditorialPage from "@/components/Admin/EditEditorialPage";
import AdminEditorialPageColumn from "../AdminEditorialPageColumn";

export const metadata: Metadata = {
  title: "New editorial page",
};

export default function NewEditorialPageRoute() {
  return (
    <AdminEditorialPageColumn>
      <EditEditorialPage page={newEditorialPage()} />
    </AdminEditorialPageColumn>
  );
}

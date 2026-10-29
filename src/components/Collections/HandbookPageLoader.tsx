import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/users/currentUser";
import {
  fetchHandbookEditData,
  fetchHandbookPage,
} from "@/lib/collections/handbookQueries";
import HandbookPage from "./HandbookPage";
import EditCollectionButton from "./EditCollectionButton";
import EditBookButton from "./EditBookButton";

export default async function HandbookPageLoader() {
  const currentUser = await getCurrentUser();
  const [data, editData] = await Promise.all([
    fetchHandbookPage(currentUser),
    fetchHandbookEditData(currentUser),
  ]);
  if (!data) {
    notFound();
  }
  return (
    <HandbookPage
      data={data}
      collectionEditControls={
        editData ? <EditCollectionButton collection={editData.collection} /> : null
      }
      bookEditControls={
        editData?.book ? <EditBookButton book={editData.book} /> : null
      }
    />
  );
}

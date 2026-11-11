import type { Metadata } from "next";
import { connection } from "next/server";
import { fetchMarginalFundingWeekAdminData } from "@/lib/marginalFundingWeekAdmin/marginalFundingWeekAdminQueries";
import MarginalFundingWeekAdminPage from "@/components/MarginalFundingWeekAdmin/MarginalFundingWeekAdminPage";

export const metadata: Metadata = {
  title: "Marginal Funding Week sequence",
};

export default async function AdminMarginalFundingWeekPage() {
  await connection();
  const data = await fetchMarginalFundingWeekAdminData();
  return <MarginalFundingWeekAdminPage {...data} />;
}

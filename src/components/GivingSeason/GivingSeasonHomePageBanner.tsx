import { connection } from "next/server";
import { isGivingSeasonOver } from "@/lib/givingSeason/givingSeason2026";
import GivingSeasonBanner from "./GivingSeasonBanner";

export default async function GivingSeasonHomePageBanner() {
  await connection();
  const now = new Date();
  return isGivingSeasonOver(now) ? null : <GivingSeasonBanner now={now.getTime()} />;
}

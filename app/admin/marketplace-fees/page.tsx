import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleFromUser } from "@/lib/auth";
import { getShopeeFeeRates } from "@/lib/marketplaceFees";
import MarketplaceFeesClient from "@/components/MarketplaceFeesClient";

export const metadata = { title: "Biaya Shopee — Ruslie Spring Admin" };

export default async function AdminMarketplaceFeesPage() {
  const supabase = createClient();
  const [
    {
      data: { user },
    },
    rates,
  ] = await Promise.all([supabase.auth.getUser(), getShopeeFeeRates(supabase)]);
  if (!user) redirect("/admin");
  if (roleFromUser(user) !== "admin") redirect("/admin/queue");

  return <MarketplaceFeesClient initialRates={rates} />;
}

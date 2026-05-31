import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listTransactions } from "@/lib/transactions";
import DashboardClient from "@/components/DashboardClient";

export const metadata = { title: "Dashboard — Ruslie Spring Admin" };

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin");

  const transactions = await listTransactions(supabase);
  return <DashboardClient transactions={transactions} />;
}

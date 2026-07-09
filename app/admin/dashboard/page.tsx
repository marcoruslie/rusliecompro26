import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listDashboardTransactions } from "@/lib/transactions";
import DashboardClient from "@/components/DashboardClient";

export const metadata = { title: "Dashboard — Ruslie Spring Admin" };

export default async function AdminDashboardPage() {
  const supabase = createClient();
  // Auth check and the data query don't depend on each other, so fire them
  // together instead of awaiting auth first (removes a request waterfall).
  const [
    {
      data: { user },
    },
    transactions,
  ] = await Promise.all([
    supabase.auth.getUser(),
    listDashboardTransactions(supabase),
  ]);
  if (!user) redirect("/admin");

  return <DashboardClient transactions={transactions} />;
}

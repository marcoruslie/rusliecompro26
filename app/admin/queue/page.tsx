import { createClient } from "@/lib/supabase/server";
import { listTransactions } from "@/lib/transactions";
import { isConnected } from "@/lib/google";
import QueueClient from "@/components/QueueClient";

export const metadata = { title: "Queue — Ruslie Spring Admin" };

export default async function QueuePage() {
  const supabase = createClient();
  const [orders, connected] = await Promise.all([
    listTransactions(supabase),
    isConnected(supabase),
  ]);
  return <QueueClient initialOrders={orders} connected={connected} />;
}

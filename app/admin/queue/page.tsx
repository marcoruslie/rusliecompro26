import { createClient } from "@/lib/supabase/server";
import { listTransactions } from "@/lib/transactions";
import { isConnected } from "@/lib/google";
import { roleFromUser } from "@/lib/auth";
import QueueClient from "@/components/QueueClient";

export const metadata = { title: "Queue — Ruslie Spring Admin" };

export default async function QueuePage() {
  const supabase = createClient();
  const [orders, connected, { data: { user } }] = await Promise.all([
    listTransactions(supabase),
    isConnected(supabase),
    supabase.auth.getUser(),
  ]);

  const role = roleFromUser(user);
  // Viewers must never receive monetary values — strip them from the payload so
  // amounts are not even present in the page HTML, not just hidden in the UI.
  const safeOrders =
    role === "viewer"
      ? orders.map((o) => ({
          ...o,
          subtotal: 0,
          total: 0,
          shipping: 0,
          items: o.items.map((it) => ({ ...it, price: 0 })),
        }))
      : orders;

  return <QueueClient initialOrders={safeOrders} connected={connected} role={role} />;
}

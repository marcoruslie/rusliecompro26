import { createClient } from "@/lib/supabase/server";
import { listCustomers } from "@/lib/customers";
import { listWires } from "@/lib/wires";
import TransactionForm from "@/components/TransactionForm";

export const metadata = { title: "New Transaction — Ruslie Spring Admin" };

export default async function NewTransactionPage() {
  const supabase = createClient();
  const [customers, wires] = await Promise.all([
    listCustomers(supabase),
    listWires(supabase),
  ]);
  return <TransactionForm initialCustomers={customers} initialWires={wires} />;
}

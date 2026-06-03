import { createClient } from "@/lib/supabase/server";
import { listCustomers } from "@/lib/customers";
import { listWires, listWireTypes } from "@/lib/wires";
import TransactionForm from "@/components/TransactionForm";

export const metadata = { title: "New Transaction — Ruslie Spring Admin" };

export default async function NewTransactionPage() {
  const supabase = createClient();
  const [customers, wires, wireTypes] = await Promise.all([
    listCustomers(supabase),
    listWires(supabase),
    listWireTypes(supabase),
  ]);
  return (
    <TransactionForm
      initialCustomers={customers}
      initialWires={wires}
      initialWireTypes={wireTypes}
    />
  );
}

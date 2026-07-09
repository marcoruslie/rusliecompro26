import { createClient } from "@/lib/supabase/server";
import { listCustomers } from "@/lib/customers";
import { listWires, listWireTypes } from "@/lib/wires";
import { listTransactions, buildItemSuggestions } from "@/lib/transactions";
import TransactionForm from "@/components/TransactionForm";

export const metadata = { title: "New Transaction — Ruslie Spring Admin" };

export default async function NewTransactionPage() {
  const supabase = createClient();
  const [customers, wires, wireTypes, transactions] = await Promise.all([
    listCustomers(supabase),
    listWires(supabase),
    listWireTypes(supabase),
    listTransactions(supabase),
  ]);
  // Pass existing invoice numbers so the form can pick the next daily sequence.
  const existingInvoiceNumbers = transactions
    .map((t) => t.invoice_number)
    .filter((n): n is string => Boolean(n));
  const itemSuggestions = buildItemSuggestions(transactions);
  return (
    <TransactionForm
      initialCustomers={customers}
      initialWires={wires}
      initialWireTypes={wireTypes}
      existingInvoiceNumbers={existingInvoiceNumbers}
      itemSuggestions={itemSuggestions}
    />
  );
}

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getTransaction,
  listTransactionItemHistory,
  buildItemSuggestions,
} from "@/lib/transactions";
import { listCustomers } from "@/lib/customers";
import { listWires, listWireTypes } from "@/lib/wires";
import { listEmployees } from "@/lib/employees";
import { getShopeeFeeRates } from "@/lib/marketplaceFees";
import TransactionForm from "@/components/TransactionForm";

export const metadata = { title: "Transaction — Ruslie Spring Admin" };

export default async function TransactionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const [txn, customers, wires, wireTypes, transactions, employees, shopeeFeeRates] =
    await Promise.all([
      getTransaction(supabase, params.id),
      listCustomers(supabase),
      listWires(supabase),
      listWireTypes(supabase),
      listTransactionItemHistory(supabase),
      listEmployees(supabase),
      getShopeeFeeRates(supabase),
    ]);
  if (!txn) notFound();
  return (
    <TransactionForm
      initialCustomers={customers}
      initialWires={wires}
      initialWireTypes={wireTypes}
      employees={employees}
      shopeeFeeRates={shopeeFeeRates}
      existing={txn}
      itemSuggestions={buildItemSuggestions(transactions)}
    />
  );
}

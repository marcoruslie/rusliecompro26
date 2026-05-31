import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTransaction } from "@/lib/transactions";
import { listCustomers } from "@/lib/customers";
import { listWires } from "@/lib/wires";
import TransactionForm from "@/components/TransactionForm";

export const metadata = { title: "Transaction — Ruslie Spring Admin" };

export default async function TransactionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const [txn, customers, wires] = await Promise.all([
    getTransaction(supabase, params.id),
    listCustomers(supabase),
    listWires(supabase),
  ]);
  if (!txn) notFound();
  return (
    <TransactionForm initialCustomers={customers} initialWires={wires} existing={txn} />
  );
}

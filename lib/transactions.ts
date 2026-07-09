import type { SupabaseClient } from "@supabase/supabase-js";
import type { Transaction, Channel } from "./types";

export async function listTransactions(
  supabase: SupabaseClient
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Transaction[];
}

// The dashboard only needs totals, a 6-month chart, and a searchable list of
// header fields — never the per-line `items` arrays (the bulk of each row's
// JSON). Selecting just these columns keeps the server→client payload small,
// which cuts TTFB serialization, hydration cost, and memory.
export interface DashboardTransaction {
  id: string;
  created_at: string | null;
  invoice_date: string;
  invoice_number: string;
  channel: Channel;
  total: number;
  customer: { name: string };
}

export async function listDashboardTransactions(
  supabase: SupabaseClient
): Promise<DashboardTransaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("id, created_at, invoice_date, invoice_number, channel, total, customer")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DashboardTransaction[];
}

export async function getTransaction(
  supabase: SupabaseClient,
  id: string
): Promise<Transaction | null> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Transaction) ?? null;
}

export async function createTransaction(
  supabase: SupabaseClient,
  txn: Omit<Transaction, "id" | "created_at">
): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .insert(txn)
    .select()
    .single();
  if (error) throw error;
  return data as Transaction;
}

export async function updateTransaction(
  supabase: SupabaseClient,
  id: string,
  txn: Omit<Transaction, "id" | "created_at">
): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .update(txn)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Transaction;
}

export async function deleteTransaction(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Transaction } from "./types";

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

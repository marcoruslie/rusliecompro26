import type { SupabaseClient } from "@supabase/supabase-js";
import type { Customer } from "./types";

export async function listCustomers(
  supabase: SupabaseClient
): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Customer[];
}

export async function createCustomer(
  supabase: SupabaseClient,
  customer: Omit<Customer, "id" | "created_at">
): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .insert(customer)
    .select()
    .single();
  if (error) throw error;
  return data as Customer;
}

export async function updateCustomer(
  supabase: SupabaseClient,
  id: string,
  customer: Omit<Customer, "id" | "created_at">
): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .update(customer)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Customer;
}

export async function deleteCustomer(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw error;
}

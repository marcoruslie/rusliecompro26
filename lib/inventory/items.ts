import type { SupabaseClient } from "@supabase/supabase-js";
import type { Item } from "@/lib/types";

export type ItemInput = Omit<Item, "id" | "created_at" | "deleted_at">;

export async function listItems(supabase: SupabaseClient): Promise<Item[]> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .is("deleted_at", null)
    .order("sku", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Item[];
}

export async function createItem(
  supabase: SupabaseClient,
  data: ItemInput
): Promise<Item> {
  const { data: row, error } = await supabase
    .from("items")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row as Item;
}

export async function updateItem(
  supabase: SupabaseClient,
  id: string,
  data: ItemInput
): Promise<Item> {
  const { data: row, error } = await supabase
    .from("items")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return row as Item;
}

export async function softDeleteItem(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

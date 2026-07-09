import type { SupabaseClient } from "@supabase/supabase-js";
import type { StorageLocation } from "@/lib/types";

export type StorageLocationInput = Omit<
  StorageLocation,
  "id" | "created_at" | "deleted_at"
>;

export async function listStorageLocations(
  supabase: SupabaseClient
): Promise<StorageLocation[]> {
  const { data, error } = await supabase
    .from("storage_locations")
    .select("*")
    .is("deleted_at", null)
    .order("warehouse_id", { ascending: true })
    .order("code", { ascending: true });
  if (error) throw error;
  return (data ?? []) as StorageLocation[];
}

export async function createStorageLocation(
  supabase: SupabaseClient,
  data: StorageLocationInput
): Promise<StorageLocation> {
  const { data: row, error } = await supabase
    .from("storage_locations")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row as StorageLocation;
}

export async function updateStorageLocation(
  supabase: SupabaseClient,
  id: string,
  data: StorageLocationInput
): Promise<StorageLocation> {
  const { data: row, error } = await supabase
    .from("storage_locations")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return row as StorageLocation;
}

export async function softDeleteStorageLocation(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("storage_locations")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

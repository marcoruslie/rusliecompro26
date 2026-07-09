import type { SupabaseClient } from "@supabase/supabase-js";
import type { Warehouse } from "@/lib/types";

export type WarehouseInput = Omit<Warehouse, "id" | "created_at" | "deleted_at">;

export async function listWarehouses(
  supabase: SupabaseClient
): Promise<Warehouse[]> {
  const { data, error } = await supabase
    .from("warehouses")
    .select("*")
    .is("deleted_at", null)
    .order("code", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Warehouse[];
}

export async function createWarehouse(
  supabase: SupabaseClient,
  data: WarehouseInput
): Promise<Warehouse> {
  const { data: row, error } = await supabase
    .from("warehouses")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row as Warehouse;
}

export async function updateWarehouse(
  supabase: SupabaseClient,
  id: string,
  data: WarehouseInput
): Promise<Warehouse> {
  const { data: row, error } = await supabase
    .from("warehouses")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return row as Warehouse;
}

export async function softDeleteWarehouse(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("warehouses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// Used by the delete guard: count active (non-deleted) locations in a warehouse.
export async function countActiveLocations(
  supabase: SupabaseClient,
  warehouseId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("storage_locations")
    .select("id", { count: "exact", head: true })
    .eq("warehouse_id", warehouseId)
    .is("deleted_at", null);
  if (error) throw error;
  return count ?? 0;
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Wire, WireType } from "./types";

/* ── Wire types ── */
export async function listWireTypes(
  supabase: SupabaseClient
): Promise<WireType[]> {
  const { data, error } = await supabase
    .from("wire_types")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WireType[];
}

export async function createWireType(
  supabase: SupabaseClient,
  name: string
): Promise<WireType> {
  const { data, error } = await supabase
    .from("wire_types")
    .insert({ name })
    .select()
    .single();
  if (error) throw error;
  return data as WireType;
}

export async function updateWireType(
  supabase: SupabaseClient,
  typeId: string,
  name: string
): Promise<WireType> {
  const { data, error } = await supabase
    .from("wire_types")
    .update({ name })
    .eq("type_id", typeId)
    .select()
    .single();
  if (error) throw error;
  return data as WireType;
}

export async function deleteWireType(
  supabase: SupabaseClient,
  typeId: string
): Promise<void> {
  const { error } = await supabase.from("wire_types").delete().eq("type_id", typeId);
  if (error) throw error;
}

/* ── Wires ── */
export async function listWires(supabase: SupabaseClient): Promise<Wire[]> {
  const { data, error } = await supabase
    .from("wires")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Wire[];
}

export async function createWire(
  supabase: SupabaseClient,
  wire: Omit<Wire, "wire_id" | "created_at">
): Promise<Wire> {
  const { data, error } = await supabase
    .from("wires")
    .insert(wire)
    .select()
    .single();
  if (error) throw error;
  return data as Wire;
}

export async function updateWire(
  supabase: SupabaseClient,
  wireId: string,
  wire: Omit<Wire, "wire_id" | "created_at">
): Promise<Wire> {
  const { data, error } = await supabase
    .from("wires")
    .update(wire)
    .eq("wire_id", wireId)
    .select()
    .single();
  if (error) throw error;
  return data as Wire;
}

export async function deleteWire(
  supabase: SupabaseClient,
  wireId: string
): Promise<void> {
  const { error } = await supabase.from("wires").delete().eq("wire_id", wireId);
  if (error) throw error;
}

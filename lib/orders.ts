import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderStatus } from "./types";

export async function updateOrderStatus(
  supabase: SupabaseClient,
  id: string,
  status: OrderStatus
): Promise<void> {
  const { error } = await supabase
    .from("transactions")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function setOrderImage(
  supabase: SupabaseClient,
  id: string,
  image: { image_drive_id: string; image_name: string }
): Promise<void> {
  const { error } = await supabase
    .from("transactions")
    .update(image)
    .eq("id", id);
  if (error) throw error;
}

export async function clearOrderImage(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("transactions")
    .update({ image_drive_id: null, image_name: null })
    .eq("id", id);
  if (error) throw error;
}

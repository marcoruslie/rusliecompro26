import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleFromUser } from "@/lib/auth";
import { listStorageLocations } from "@/lib/inventory/storageLocations";
import { listWarehouses } from "@/lib/inventory/warehouses";
import StorageLocationsClient from "@/components/StorageLocationsClient";

export const metadata = { title: "Storage Locations — Ruslie Spring Admin" };

export default async function AdminStorageLocationsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin");
  if (roleFromUser(user) !== "admin") redirect("/admin/queue");

  const [locations, warehouses] = await Promise.all([
    listStorageLocations(supabase),
    listWarehouses(supabase),
  ]);
  return (
    <StorageLocationsClient
      initialLocations={locations}
      initialWarehouses={warehouses}
    />
  );
}

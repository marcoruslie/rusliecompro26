import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleFromUser } from "@/lib/auth";
import { listStorageLocations } from "@/lib/inventory/storageLocations";
import { listWarehouses } from "@/lib/inventory/warehouses";
import StorageLocationsClient from "@/components/StorageLocationsClient";

export const metadata = { title: "Storage Locations — Ruslie Spring Admin" };

export default async function AdminStorageLocationsPage() {
  const supabase = createClient();
  // Auth check and the data queries don't depend on each other, so fire them
  // together instead of awaiting auth first (removes a request waterfall).
  const [
    {
      data: { user },
    },
    locations,
    warehouses,
  ] = await Promise.all([
    supabase.auth.getUser(),
    listStorageLocations(supabase),
    listWarehouses(supabase),
  ]);
  if (!user) redirect("/admin");
  if (roleFromUser(user) !== "admin") redirect("/admin/queue");
  return (
    <StorageLocationsClient
      initialLocations={locations}
      initialWarehouses={warehouses}
    />
  );
}

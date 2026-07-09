import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleFromUser } from "@/lib/auth";
import { listWarehouses } from "@/lib/inventory/warehouses";
import WarehousesClient from "@/components/WarehousesClient";

export const metadata = { title: "Warehouses — Ruslie Spring Admin" };

export default async function AdminWarehousesPage() {
  const supabase = createClient();
  // Auth check and the data query don't depend on each other, so fire them
  // together instead of awaiting auth first (removes a request waterfall).
  const [
    {
      data: { user },
    },
    warehouses,
  ] = await Promise.all([supabase.auth.getUser(), listWarehouses(supabase)]);
  if (!user) redirect("/admin");
  if (roleFromUser(user) !== "admin") redirect("/admin/queue");

  return <WarehousesClient initialWarehouses={warehouses} />;
}

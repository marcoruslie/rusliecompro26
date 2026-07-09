import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleFromUser } from "@/lib/auth";
import { listWarehouses } from "@/lib/inventory/warehouses";
import WarehousesClient from "@/components/WarehousesClient";

export const metadata = { title: "Warehouses — Ruslie Spring Admin" };

export default async function AdminWarehousesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin");
  if (roleFromUser(user) !== "admin") redirect("/admin/queue");

  const warehouses = await listWarehouses(supabase);
  return <WarehousesClient initialWarehouses={warehouses} />;
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleFromUser } from "@/lib/auth";
import { listItems } from "@/lib/inventory/items";
import ItemsClient from "@/components/ItemsClient";

export const metadata = { title: "Items — Ruslie Spring Admin" };

export default async function AdminItemsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin");
  if (roleFromUser(user) !== "admin") redirect("/admin/queue");

  const items = await listItems(supabase);
  return <ItemsClient initialItems={items} />;
}

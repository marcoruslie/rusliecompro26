import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleFromUser } from "@/lib/auth";
import { listItems } from "@/lib/inventory/items";
import ItemsClient from "@/components/ItemsClient";

export const metadata = { title: "Items — Ruslie Spring Admin" };

export default async function AdminItemsPage() {
  const supabase = createClient();
  // Auth check and the data query don't depend on each other, so fire them
  // together instead of awaiting auth first (removes a request waterfall).
  const [
    {
      data: { user },
    },
    items,
  ] = await Promise.all([supabase.auth.getUser(), listItems(supabase)]);
  if (!user) redirect("/admin");
  if (roleFromUser(user) !== "admin") redirect("/admin/queue");

  return <ItemsClient initialItems={items} />;
}

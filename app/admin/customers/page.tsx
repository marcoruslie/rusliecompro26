import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listCustomers } from "@/lib/customers";
import CustomersClient from "@/components/CustomersClient";

export const metadata = { title: "Customers — Ruslie Spring Admin" };

export default async function AdminCustomersPage() {
  const supabase = createClient();
  // Auth check and the data query don't depend on each other, so fire them
  // together instead of awaiting auth first (removes a request waterfall).
  const [
    {
      data: { user },
    },
    customers,
  ] = await Promise.all([supabase.auth.getUser(), listCustomers(supabase)]);
  if (!user) redirect("/admin");

  return <CustomersClient initialCustomers={customers} />;
}

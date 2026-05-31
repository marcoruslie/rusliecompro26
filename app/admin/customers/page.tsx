import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listCustomers } from "@/lib/customers";
import CustomersClient from "@/components/CustomersClient";

export const metadata = { title: "Customers — Ruslie Spring Admin" };

export default async function AdminCustomersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin");

  const customers = await listCustomers(supabase);
  return <CustomersClient initialCustomers={customers} />;
}

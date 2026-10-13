import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleFromUser } from "@/lib/auth";
import { listEmployees } from "@/lib/employees";
import EmployeesClient from "@/components/EmployeesClient";

export const metadata = { title: "Karyawan — Ruslie Spring Admin" };

export default async function AdminEmployeesPage() {
  const supabase = createClient();
  const [
    {
      data: { user },
    },
    employees,
  ] = await Promise.all([supabase.auth.getUser(), listEmployees(supabase)]);
  if (!user) redirect("/admin");
  if (roleFromUser(user) !== "admin") redirect("/admin/queue");

  return <EmployeesClient initialEmployees={employees} />;
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminLoginClient from "@/components/AdminLoginClient";

export const metadata = { title: "Admin — Ruslie Spring" };

export default async function AdminLoginPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/admin/dashboard");
  }

  return <AdminLoginClient />;
}

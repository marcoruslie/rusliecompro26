import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleFromUser } from "@/lib/auth";

/** TKA pages are admin-only; viewers stay confined to the Queue. */
export async function requireTkaAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin");
  if (roleFromUser(user) === "viewer") redirect("/admin/queue");
  return user;
}

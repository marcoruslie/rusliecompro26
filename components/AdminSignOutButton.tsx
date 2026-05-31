"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminSignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/admin");
    router.refresh();
  }

  return (
    <button onClick={handleSignOut} className="admin-btn-ghost">
      Sign Out
    </button>
  );
}

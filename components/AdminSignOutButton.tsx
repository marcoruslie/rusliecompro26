"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminSignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/admin");
    router.refresh();
  }

  return (
    <button onClick={handleSignOut} disabled={pending} className="admin-btn-ghost">
      {pending ? <span className="admin-btn-spinner" /> : null}
      {pending ? "Keluar…" : "Sign Out"}
    </button>
  );
}

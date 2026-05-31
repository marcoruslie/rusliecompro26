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
    <button
      onClick={handleSignOut}
      className="text-sm font-semibold px-4 py-2 rounded-lg border transition-colors"
      style={{
        color: "#021d47",
        borderColor: "rgba(2,29,71,0.2)",
        background: "#fff",
        cursor: "pointer",
      }}
    >
      Sign Out
    </button>
  );
}

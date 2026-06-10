import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { roleFromUser } from "@/lib/auth";
import { disconnect } from "@/lib/google";

// Clears the stored Google connection (and revokes it at Google). Editors only.
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (roleFromUser(user) === "viewer")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await disconnect(supabase);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Disconnect failed" },
      { status: 500 }
    );
  }
}

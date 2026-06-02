import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeCode,
  saveTokens,
  ensureFolder,
  getAccessToken,
} from "@/lib/google";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const origin = req.nextUrl.origin;
  if (!code) {
    return NextResponse.redirect(`${origin}/admin/queue?error=missing_code`);
  }
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(`${origin}/admin`);

    const tokens = await exchangeCode(code);
    await saveTokens(supabase, tokens);
    const token = await getAccessToken(supabase);
    await ensureFolder(supabase, token);
    return NextResponse.redirect(`${origin}/admin/queue?connected=1`);
  } catch (e) {
    return NextResponse.redirect(`${origin}/admin/queue?error=oauth_failed`);
  }
}

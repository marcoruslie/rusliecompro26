import { NextResponse } from "next/server";
import { buildConsentUrl } from "@/lib/google";

// Reads runtime env + redirects; must not be prerendered at build time.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.redirect(buildConsentUrl());
}

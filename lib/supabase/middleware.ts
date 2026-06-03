import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { roleFromUser } from "@/lib/auth";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/admin";
  const isProtected = pathname.startsWith("/admin");
  const role = roleFromUser(user);
  // Viewers are confined to the Queue page; everywhere else under /admin is admin-only.
  const isViewerAllowed = pathname === "/admin/queue" || pathname.startsWith("/admin/queue/");

  if (!user && isProtected && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = role === "viewer" ? "/admin/queue" : "/admin/dashboard";
    return NextResponse.redirect(url);
  }

  if (user && role === "viewer" && isProtected && !isLoginPage && !isViewerAllowed) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/queue";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

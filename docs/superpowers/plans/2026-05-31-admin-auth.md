# Admin Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Git policy for this project:** The user has instructed **never commit to git**. This plan contains **no commit steps**. Each task ends with a verification checkpoint instead. Leave all staging/committing to the user.

**Goal:** Add a username/password admin login at `/admin` backed by Supabase, with server-enforced route protection and a protected dashboard placeholder.

**Architecture:** `@supabase/ssr` with cookie-based sessions. A `middleware.ts` refreshes the session on every request and guards `/admin/*`. The login screen takes a username only; the app maps `username` → `username@ruslie.local` before calling Supabase Auth. Accounts are created manually in the Supabase dashboard.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind, `@supabase/ssr`, `@supabase/supabase-js`. Path alias `@/*` → project root. Brand: navy `#021d47`, Playfair Display + DM Sans.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `.env.local` | Supabase URL + anon key (gitignored; user pastes their keys) |
| `lib/auth.ts` | `usernameToEmail()` — single source of truth for the `ruslie.local` domain |
| `lib/supabase/client.ts` | Browser Supabase client |
| `lib/supabase/server.ts` | Server Supabase client (reads/writes cookies) |
| `lib/supabase/middleware.ts` | Session-refresh + guard helper used by root middleware |
| `middleware.ts` | Root middleware; runs the guard on `/admin/:path*` |
| `app/admin/page.tsx` | Login page (server component): redirects to dashboard if already logged in, else renders the form |
| `components/AdminLoginClient.tsx` | Username + password form, error/loading states, brand-styled |
| `app/admin/dashboard/page.tsx` | Protected placeholder (server component) + sign-out |
| `components/AdminSignOutButton.tsx` | Client sign-out button |

---

## Task 1: Install dependencies and configure env

**Files:**
- Modify: `package.json` (via install)
- Create: `.env.local`
- Create: `.env.local.example`

- [ ] **Step 1: Install Supabase packages**

Run:
```bash
npm install @supabase/ssr @supabase/supabase-js
```
Expected: both packages added to `dependencies` in `package.json`, no errors.

- [ ] **Step 2: Create `.env.local` with the user's existing keys**

Create `.env.local` (project root). The user pastes their real values from
Supabase dashboard → Project Settings → API:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

- [ ] **Step 3: Create `.env.local.example` for reference (safe to keep in repo)**

Create `.env.local.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

- [ ] **Step 4: Verify env is gitignored**

Run:
```bash
git check-ignore .env.local
```
Expected output: `.env.local` (confirms it will not be committed).

**Checkpoint:** Packages installed, `.env.local` present with real keys, example file created.

---

## Task 2: Username→email helper

**Files:**
- Create: `lib/auth.ts`

- [ ] **Step 1: Create the helper**

Create `lib/auth.ts`:
```ts
/**
 * Admin login is username-only on screen. Supabase Auth is email-based, so we map
 * every username to a fixed internal domain that is never displayed or delivered.
 * To create an account, set the user's email in the Supabase dashboard to
 * `<username>@ruslie.local` (e.g. admin@ruslie.local).
 */
export const ADMIN_EMAIL_DOMAIN = "ruslie.local";

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${ADMIN_EMAIL_DOMAIN}`;
}
```

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors related to `lib/auth.ts`.

**Checkpoint:** `usernameToEmail("admin")` would return `admin@ruslie.local`.

---

## Task 3: Supabase clients (browser + server)

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

- [ ] **Step 1: Browser client**

Create `lib/supabase/client.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: Server client**

Create `lib/supabase/server.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // Safe to ignore when middleware refreshes the session.
          }
        },
      },
    }
  );
}
```

- [ ] **Step 3: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors.

**Checkpoint:** Both client factories compile.

---

## Task 4: Middleware session refresh + route guard

**Files:**
- Create: `lib/supabase/middleware.ts`
- Create: `middleware.ts`

- [ ] **Step 1: Guard helper**

Create `lib/supabase/middleware.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  // Not logged in, visiting a protected page that isn't the login page → send to login.
  if (!user && isProtected && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  // Logged in but sitting on the login page → send to dashboard.
  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

- [ ] **Step 2: Root middleware**

Create `middleware.ts` (project root):
```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

- [ ] **Step 3: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors.

**Checkpoint:** Middleware compiles; matcher targets only `/admin/*`.

---

## Task 5: Login form component

**Files:**
- Create: `components/AdminLoginClient.tsx`

- [ ] **Step 1: Create the form**

Create `components/AdminLoginClient.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usernameToEmail } from "@/lib/auth";

export default function AdminLoginClient() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Username and password are required.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    setLoading(false);

    if (signInError) {
      setError("Invalid username or password.");
      return;
    }

    router.replace("/admin/dashboard");
    router.refresh();
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: "linear-gradient(135deg, #021d47 0%, #0b2255 100%)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold"
            style={{
              background: "#021d47",
              color: "#fff",
              fontFamily: "'Playfair Display', serif",
            }}
          >
            R
          </div>
          <div>
            <h1
              className="text-lg font-bold leading-none"
              style={{ color: "#021d47", fontFamily: "'Playfair Display', serif" }}
            >
              Admin
            </h1>
            <p className="text-[0.7rem] tracking-widest uppercase text-gray-400 mt-1">
              Ruslie Spring
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-[#021d47] transition-colors"
              placeholder="admin"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-[#021d47] transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-500 text-xs">⚠ {error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-semibold py-2.5 rounded-lg text-sm tracking-wide transition-opacity disabled:opacity-60"
            style={{ background: "#021d47", cursor: loading ? "default" : "pointer" }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors.

**Checkpoint:** Form compiles; calls `signInWithPassword` with mapped email.

---

## Task 6: Login page (server) + fonts

**Files:**
- Create: `app/admin/page.tsx`

- [ ] **Step 1: Create the login route**

The page is a server component that double-checks auth (middleware already guards,
but this prevents any flash) and otherwise renders the form. It also loads the brand
fonts via a `<link>` so the styled form matches the rest of the site.

Create `app/admin/page.tsx`:
```tsx
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

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <AdminLoginClient />
    </>
  );
}
```

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors.

**Checkpoint:** `/admin` route compiles.

---

## Task 7: Sign-out button + protected dashboard placeholder

**Files:**
- Create: `components/AdminSignOutButton.tsx`
- Create: `app/admin/dashboard/page.tsx`

- [ ] **Step 1: Sign-out button**

Create `components/AdminSignOutButton.tsx`:
```tsx
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
```

- [ ] **Step 2: Dashboard placeholder**

Create `app/admin/dashboard/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminSignOutButton from "@/components/AdminSignOutButton";

export const metadata = { title: "Dashboard — Ruslie Spring Admin" };

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin");
  }

  const username = user.email?.split("@")[0] ?? "admin";

  return (
    <div
      className="min-h-screen px-6 py-10"
      style={{ background: "#f0f4f8", fontFamily: "'DM Sans', sans-serif" }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[0.7rem] tracking-widest uppercase text-gray-400">
              Ruslie Spring Admin
            </p>
            <h1
              className="text-2xl font-bold"
              style={{ color: "#021d47", fontFamily: "'Playfair Display', serif" }}
            >
              Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">Signed in as {username}</p>
          </div>
          <AdminSignOutButton />
        </div>

        <div
          className="rounded-2xl bg-white p-10 text-center shadow-sm"
          style={{ border: "1px solid rgba(2,29,71,0.08)" }}
        >
          <p className="text-gray-400 text-sm">
            Transaction recording &amp; dashboard coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors.

**Checkpoint:** Dashboard + sign-out compile.

---

## Task 8: Create the admin user in Supabase + manual verification

**Files:** none (manual + dev server)

- [ ] **Step 1: Create the admin account in Supabase**

In the Supabase dashboard: Authentication → Users → **Add user** → Create new user.
- Email: `admin@ruslie.local`
- Password: choose a strong password
- **Auto Confirm User: ON** (so no email confirmation is needed for the internal domain)

- [ ] **Step 2: Start the dev server**

Run:
```bash
npm run dev
```
Expected: server on `http://localhost:3000`, no startup errors.

- [ ] **Step 3: Verify logged-out access shows login**

Visit `http://localhost:3000/admin`.
Expected: the navy login card with Username + Password fields.

- [ ] **Step 4: Verify protected route redirects when logged out**

Visit `http://localhost:3000/admin/dashboard` in a fresh/incognito window.
Expected: redirected to `/admin` (login).

- [ ] **Step 5: Verify wrong credentials error**

Enter username `admin` + a wrong password → Sign In.
Expected: inline "⚠ Invalid username or password." and you stay on the login page.

- [ ] **Step 6: Verify successful login**

Enter username `admin` + the correct password → Sign In.
Expected: redirected to `/admin/dashboard`, "Signed in as admin" visible.

- [ ] **Step 7: Verify already-logged-in redirect**

While logged in, visit `http://localhost:3000/admin`.
Expected: redirected to `/admin/dashboard`.

- [ ] **Step 8: Verify sign-out**

Click **Sign Out**.
Expected: back on `/admin` login. Then visiting `/admin/dashboard` redirects to login again.

**Checkpoint:** All eight checks pass. Auth foundation is complete.

---

## Self-Review Notes

- **Spec coverage:** username-only login (Tasks 2,5,6), no register page (none created),
  Supabase via `@supabase/ssr` (Tasks 3,4), middleware guard (Task 4), login at `/admin`
  (Task 6), protected dashboard placeholder (Task 7), error/empty-field handling (Task 5),
  brand styling (Tasks 5,7), env setup (Task 1), account creation steps (Task 8) — all covered.
- **Git:** no commit steps anywhere, per user instruction.
- **Type consistency:** `createClient` name used consistently for both browser and server
  factories (imported from different paths); `usernameToEmail` signature matches its use.
```

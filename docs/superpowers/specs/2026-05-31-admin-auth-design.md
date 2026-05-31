# Admin Auth — Design Spec

**Date:** 2026-05-31
**Status:** Approved
**Scope:** First sub-project of the admin system — authentication only.

## Background

Ruslie Spring's site (Next.js 14, App Router) currently has an invoice generator,
a calculator, and a landing page. The goal is an internal admin system that records
many transactions and, later, shows a transaction dashboard — eventually replacing the
invoice generator.

This spec covers **only the authentication foundation**. Transaction recording, the
dashboard, and removing the invoice generator are separate, later sub-projects.

## Decisions

- **Database/auth provider:** Supabase (project already exists; keys ready).
- **Registration:** None in the app. Accounts are created manually in the Supabase
  dashboard (Authentication → Users → Add user). Login page only.
- **Login identifier:** Username only — no email shown on screen. Supabase Auth is
  email-based under the hood, so the app maps `username` → `username@ruslie.local`
  (fixed internal domain, never displayed). To create an account, set the user's email
  in the Supabase dashboard to `<username>@ruslie.local` (e.g. `admin@ruslie.local`).
- **Auth approach:** `@supabase/ssr` with cookie-based sessions and a `middleware.ts`
  route guard — server-enforced protection, scales to server-rendered dashboards next.

## Architecture

**Packages added:** `@supabase/ssr`, `@supabase/supabase-js`

**Files:**

| File | Purpose |
|------|---------|
| `.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (user pastes existing keys) |
| `lib/supabase/client.ts` | Browser Supabase client (`createBrowserClient`) |
| `lib/supabase/server.ts` | Server Supabase client (`createServerClient`, reads/writes cookies) |
| `middleware.ts` | Refreshes session every request; guards `/admin/*` |
| `app/admin/page.tsx` | Login page, rendered at `/admin` when logged out |
| `components/AdminLoginClient.tsx` | Login form (username + password, error/loading states), brand-styled. Maps username → `username@ruslie.local` before calling Supabase |
| `lib/auth.ts` | Small helper: `usernameToEmail(username)` → `` `${username}@ruslie.local` `` (single source of truth for the domain) |
| `app/admin/dashboard/page.tsx` | Protected placeholder ("Dashboard coming soon" + sign-out) |

## Data Flow

1. Visit `/admin` logged out → login form (username + password).
2. Submit → map username to `username@ruslie.local` → `supabase.auth.signInWithPassword`
   → redirect `/admin/dashboard`.
3. Visit `/admin` (or any `/admin/*`) already logged in → redirect `/admin/dashboard`.
4. Visit `/admin/dashboard` logged out → redirect `/admin`.
5. Sign out → `supabase.auth.signOut` → redirect `/admin`.

Route protection lives in `middleware.ts` (matcher on `/admin/:path*`), which checks the
session and redirects. The login page itself (`/admin`) is reachable when logged out and
redirects away when logged in.

## Error Handling

- Invalid credentials → inline error message under the form ("Invalid username or password").
- Empty fields → client-side validation before submit.
- Network/Supabase errors → generic inline error, form stays usable.
- Missing env vars → fail clearly in dev (the Supabase client throws on init).

## Styling

Matches existing brand: navy `#021d47`, Playfair Display (headings) + DM Sans (body),
consistent with `InvoiceClient.tsx` / landing page. Centered card layout for the login form.

## Testing / Verification

- Logged-out visit to `/admin` shows the username/password login form.
- Wrong username/password shows the inline error.
- Correct credentials (e.g. `admin` + password for `admin@ruslie.local`) redirect to `/admin/dashboard`.
- Direct visit to `/admin/dashboard` while logged out redirects to `/admin`.
- Sign-out returns to `/admin` and re-protects `/admin/dashboard`.

## Out of Scope (later sub-projects)

- Transaction recording (forms + Supabase tables).
- Transaction dashboard (data, charts, listing).
- Removing/retiring the invoice generator.
- Public registration / multi-role permissions.

# Order Queue + Google Drive Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **GIT POLICY (user override):** Do NOT run `git add`/`git commit`/`git push` at any point. The user controls all git operations. "Verify" steps replace "commit" steps.

> **TESTING NOTE:** This codebase has no test framework. Verification is done via `npx tsc --noEmit` (type check), `npm run build`, and explicit manual checks. No automated test files are added.

**Goal:** Add an admin Queue page that tracks orders (existing transactions) by status (processing/completed) and lets the admin upload one image per order to Google Drive and download it back.

**Architecture:** Existing `transactions` rows gain `status` + image columns. Google Drive access uses OAuth (`drive.file` scope) with the refresh token stored in a single-row Supabase table; App Router route handlers perform token refresh, upload, download, delete using plain `fetch` (no new deps). A `QueueClient` component mirrors existing `*Client.tsx` patterns with Processing/Completed tabs.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Supabase (`@supabase/ssr`), Tailwind, lucide-react, Google Drive REST API.

---

## File Structure

- Create: `supabase/migrations/0003_order_queue.sql` — schema changes.
- Modify: `lib/types.ts` — extend `Transaction`, add `OrderStatus`.
- Create: `lib/google.ts` — Google OAuth + Drive helpers (server-only).
- Create: `lib/orders.ts` — status + image column updates.
- Create: `app/api/google/connect/route.ts` — consent redirect.
- Create: `app/api/google/callback/route.ts` — token exchange + folder creation.
- Create: `app/api/orders/[id]/image/route.ts` — POST upload / GET download / DELETE.
- Modify: `components/AdminNav.tsx` — add Queue link.
- Create: `app/admin/queue/page.tsx` — server component.
- Create: `components/QueueClient.tsx` — client UI (tabs, actions, banner).
- Modify: `.env.local` — Google credentials (user does this manually).

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/0003_order_queue.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Order queue: status + single image per transaction
alter table public.transactions
  add column if not exists status text not null default 'processing'
    check (status in ('processing','completed')),
  add column if not exists image_drive_id text,
  add column if not exists image_name text;

create index if not exists transactions_status_idx on public.transactions (status);

-- Single-row store for the Google OAuth connection (server-side secrets)
create table if not exists public.google_oauth (
  id int primary key default 1 check (id = 1),
  created_at timestamptz not null default now(),
  refresh_token text,
  access_token text,
  token_expiry timestamptz,
  drive_folder_id text
);

alter table public.google_oauth enable row level security;

create policy "authenticated full access to google_oauth"
  on public.google_oauth for all
  to authenticated using (true) with check (true);
```

- [ ] **Step 2: Verify**

Run the SQL in the Supabase SQL editor (user action). Confirm `transactions` has `status`, `image_drive_id`, `image_name` and that `google_oauth` exists. Existing rows should show `status = 'processing'`.

---

## Task 2: Extend types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add the OrderStatus type and extend Transaction**

Add near the top type aliases:

```ts
export type OrderStatus = "processing" | "completed";
```

Add these fields inside the `Transaction` interface (after `sender_name`):

```ts
  status: OrderStatus;
  image_drive_id?: string | null;
  image_name?: string | null;
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: existing `createTransaction`/`updateTransaction` callers may now error because `status` is required on `Transaction`. That is expected and fixed in Task 3.

---

## Task 3: Make status optional on write paths

Existing `createTransaction`/`updateTransaction` take `Omit<Transaction, "id" | "created_at">`. New DB columns have defaults, so the form must not be forced to send them.

**Files:**
- Modify: `lib/transactions.ts`

- [ ] **Step 1: Loosen the write payload type**

In `lib/transactions.ts`, change the payload type used by `createTransaction` and `updateTransaction` from:

```ts
txn: Omit<Transaction, "id" | "created_at">
```

to:

```ts
txn: Omit<Transaction, "id" | "created_at" | "status" | "image_drive_id" | "image_name">
```

Apply this to BOTH `createTransaction` and `updateTransaction` signatures.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS (no errors). `TransactionForm` keeps compiling because it never sets `status`/image fields.

---

## Task 4: Order data helpers

**Files:**
- Create: `lib/orders.ts`

- [ ] **Step 1: Write the helpers**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderStatus } from "./types";

export async function updateOrderStatus(
  supabase: SupabaseClient,
  id: string,
  status: OrderStatus
): Promise<void> {
  const { error } = await supabase
    .from("transactions")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function setOrderImage(
  supabase: SupabaseClient,
  id: string,
  image: { image_drive_id: string; image_name: string }
): Promise<void> {
  const { error } = await supabase
    .from("transactions")
    .update(image)
    .eq("id", id);
  if (error) throw error;
}

export async function clearOrderImage(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("transactions")
    .update({ image_drive_id: null, image_name: null })
    .eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS.

---

## Task 5: Google Drive helper library

**Files:**
- Create: `lib/google.ts`

- [ ] **Step 1: Write the helper**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const DRIVE_FILES = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const FOLDER_NAME = "Ruslie Spring Orders";

interface OAuthRow {
  refresh_token: string | null;
  access_token: string | null;
  token_expiry: string | null;
  drive_folder_id: string | null;
}

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export function buildConsentUrl(): string {
  const params = new URLSearchParams({
    client_id: env("GOOGLE_CLIENT_ID"),
    redirect_uri: env("GOOGLE_REDIRECT_URI"),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function getStoredAuth(
  supabase: SupabaseClient
): Promise<OAuthRow | null> {
  const { data, error } = await supabase
    .from("google_oauth")
    .select("refresh_token, access_token, token_expiry, drive_folder_id")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return (data as OAuthRow) ?? null;
}

export async function isConnected(supabase: SupabaseClient): Promise<boolean> {
  const row = await getStoredAuth(supabase);
  return !!row?.refresh_token;
}

export async function exchangeCode(code: string): Promise<{
  refresh_token?: string;
  access_token: string;
  expires_in: number;
}> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env("GOOGLE_CLIENT_ID"),
      client_secret: env("GOOGLE_CLIENT_SECRET"),
      redirect_uri: env("GOOGLE_REDIRECT_URI"),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  return res.json();
}

async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env("GOOGLE_CLIENT_ID"),
      client_secret: env("GOOGLE_CLIENT_SECRET"),
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  return res.json();
}

// Returns a valid access token, refreshing + persisting when expired.
export async function getAccessToken(
  supabase: SupabaseClient
): Promise<string> {
  const row = await getStoredAuth(supabase);
  if (!row?.refresh_token) throw new Error("Google account not connected");

  const stillValid =
    row.access_token &&
    row.token_expiry &&
    new Date(row.token_expiry).getTime() - 60_000 > Date.now();
  if (stillValid) return row.access_token as string;

  const refreshed = await refreshAccessToken(row.refresh_token);
  const expiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  const { error } = await supabase
    .from("google_oauth")
    .update({ access_token: refreshed.access_token, token_expiry: expiry })
    .eq("id", 1);
  if (error) throw error;
  return refreshed.access_token;
}

async function createFolder(token: string): Promise<string> {
  const res = await fetch(DRIVE_FILES, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  if (!res.ok) throw new Error(`Folder create failed: ${await res.text()}`);
  const json = await res.json();
  return json.id as string;
}

// Returns the stored folder id, creating + persisting it if absent.
export async function ensureFolder(
  supabase: SupabaseClient,
  token: string
): Promise<string> {
  const row = await getStoredAuth(supabase);
  if (row?.drive_folder_id) return row.drive_folder_id;
  const folderId = await createFolder(token);
  const { error } = await supabase
    .from("google_oauth")
    .update({ drive_folder_id: folderId })
    .eq("id", 1);
  if (error) throw error;
  return folderId;
}

// Persists tokens after the OAuth callback. Upserts the single row.
export async function saveTokens(
  supabase: SupabaseClient,
  tokens: { refresh_token?: string; access_token: string; expires_in: number }
): Promise<void> {
  const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const payload: Record<string, unknown> = {
    id: 1,
    access_token: tokens.access_token,
    token_expiry: expiry,
  };
  if (tokens.refresh_token) payload.refresh_token = tokens.refresh_token;
  const { error } = await supabase
    .from("google_oauth")
    .upsert(payload, { onConflict: "id" });
  if (error) throw error;
}

export async function uploadImage(
  token: string,
  folderId: string,
  file: File
): Promise<string> {
  const metadata = { name: file.name, parents: [folderId] };
  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("file", file);
  const res = await fetch(DRIVE_UPLOAD, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`);
  const json = await res.json();
  return json.id as string;
}

export async function downloadImage(
  token: string,
  fileId: string
): Promise<Response> {
  const res = await fetch(`${DRIVE_FILES}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Download failed: ${await res.text()}`);
  return res;
}

export async function deleteImage(token: string, fileId: string): Promise<void> {
  const res = await fetch(`${DRIVE_FILES}/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  // 404 means already gone — treat as success.
  if (!res.ok && res.status !== 404)
    throw new Error(`Delete failed: ${await res.text()}`);
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS.

---

## Task 6: OAuth connect route

**Files:**
- Create: `app/api/google/connect/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from "next/server";
import { buildConsentUrl } from "@/lib/google";

export async function GET() {
  return NextResponse.redirect(buildConsentUrl());
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS.

---

## Task 7: OAuth callback route

**Files:**
- Create: `app/api/google/callback/route.ts`

- [ ] **Step 1: Write the route**

```ts
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
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS.

---

## Task 8: Image upload / download / delete route

**Files:**
- Create: `app/api/orders/[id]/image/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTransaction } from "@/lib/transactions";
import { setOrderImage, clearOrderImage } from "@/lib/orders";
import {
  getAccessToken,
  ensureFolder,
  uploadImage,
  downloadImage,
  deleteImage,
} from "@/lib/google";

async function requireUser(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  if (!(await requireUser(supabase)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "No file" }, { status: 400 });

  try {
    const token = await getAccessToken(supabase);
    const folderId = await ensureFolder(supabase, token);
    const driveId = await uploadImage(token, folderId, file);
    await setOrderImage(supabase, params.id, {
      image_drive_id: driveId,
      image_name: file.name,
    });
    return NextResponse.json({ image_drive_id: driveId, image_name: file.name });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  if (!(await requireUser(supabase)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const txn = await getTransaction(supabase, params.id);
  if (!txn?.image_drive_id)
    return NextResponse.json({ error: "No image" }, { status: 404 });

  try {
    const token = await getAccessToken(supabase);
    const driveRes = await downloadImage(token, txn.image_drive_id);
    const headers = new Headers();
    headers.set(
      "Content-Type",
      driveRes.headers.get("Content-Type") ?? "application/octet-stream"
    );
    headers.set(
      "Content-Disposition",
      `attachment; filename="${txn.image_name ?? "image"}"`
    );
    return new NextResponse(driveRes.body, { headers });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Download failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  if (!(await requireUser(supabase)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const txn = await getTransaction(supabase, params.id);
  try {
    if (txn?.image_drive_id) {
      const token = await getAccessToken(supabase);
      await deleteImage(token, txn.image_drive_id);
    }
    await clearOrderImage(supabase, params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Delete failed" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS.

---

## Task 9: Add Queue to AdminNav

**Files:**
- Modify: `components/AdminNav.tsx`

- [ ] **Step 1: Add the import**

Change the lucide import line to include `ListChecks`:

```ts
import { Home, Users, Cable, FileText, ListChecks } from "lucide-react";
```

- [ ] **Step 2: Extend the AdminPage union**

```ts
export type AdminPage = "dashboard" | "customers" | "wires" | "transaction" | "queue";
```

- [ ] **Step 3: Add the nav link**

In the `LINKS` array, add after the `transaction` entry:

```ts
  { key: "queue", href: "/admin/queue", label: "Queue", Icon: ListChecks },
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: PASS.

---

## Task 10: Queue server page

**Files:**
- Create: `app/admin/queue/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
import { createClient } from "@/lib/supabase/server";
import { listTransactions } from "@/lib/transactions";
import { isConnected } from "@/lib/google";
import QueueClient from "@/components/QueueClient";

export const metadata = { title: "Queue — Ruslie Spring Admin" };

export default async function QueuePage() {
  const supabase = createClient();
  const [orders, connected] = await Promise.all([
    listTransactions(supabase),
    isConnected(supabase),
  ]);
  return <QueueClient initialOrders={orders} connected={connected} />;
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS.

---

## Task 11: Queue client UI

**Files:**
- Create: `components/QueueClient.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Upload,
  Download,
  Trash2,
  CheckCircle2,
  RotateCcw,
  ImageIcon,
  Link2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateOrderStatus } from "@/lib/orders";
import type { Transaction, OrderStatus } from "@/lib/types";
import AdminNav from "@/components/AdminNav";

function formatRupiah(n: number) {
  return "Rp " + (n ?? 0).toLocaleString("id-ID");
}

export default function QueueClient({
  initialOrders,
  connected,
}: {
  initialOrders: Transaction[];
  connected: boolean;
}) {
  const params = useSearchParams();
  const [orders, setOrders] = useState<Transaction[]>(initialOrders);
  const [tab, setTab] = useState<OrderStatus>("processing");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const justConnected = params.get("connected") === "1";
  const oauthError = params.get("error");

  const visible = orders.filter((o) => (o.status ?? "processing") === tab);
  const counts = {
    processing: orders.filter((o) => (o.status ?? "processing") === "processing").length,
    completed: orders.filter((o) => o.status === "completed").length,
  };

  async function toggleStatus(o: Transaction) {
    if (!o.id) return;
    const next: OrderStatus = o.status === "completed" ? "processing" : "completed";
    setBusyId(o.id);
    setError("");
    const supabase = createClient();
    try {
      await updateOrderStatus(supabase, o.id, next);
      setOrders((prev) =>
        prev.map((x) => (x.id === o.id ? { ...x, status: next } : x))
      );
    } catch {
      setError("Gagal mengubah status.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleUpload(o: Transaction, file: File) {
    if (!o.id) return;
    setBusyId(o.id);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/orders/${o.id}/image`, {
        method: "POST",
        body,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrders((prev) =>
        prev.map((x) =>
          x.id === o.id
            ? { ...x, image_drive_id: data.image_drive_id, image_name: data.image_name }
            : x
        )
      );
    } catch {
      setError("Gagal mengunggah gambar.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemoveImage(o: Transaction) {
    if (!o.id || !confirm("Hapus gambar order ini?")) return;
    setBusyId(o.id);
    setError("");
    try {
      const res = await fetch(`/api/orders/${o.id}/image`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setOrders((prev) =>
        prev.map((x) =>
          x.id === o.id ? { ...x, image_drive_id: null, image_name: null } : x
        )
      );
    } catch {
      setError("Gagal menghapus gambar.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="admin-shell px-6 pb-10 pt-[92px]">
      <AdminNav active="queue" />
      <div className="admin-content max-w-5xl mx-auto">
        <div className="mb-8 admin-rise">
          <p className="admin-eyebrow">Ruslie Spring Admin</p>
          <h1 className="admin-title text-3xl mt-1">Queue</h1>
        </div>

        {/* Google connect banner */}
        {!connected && (
          <div className="admin-panel admin-rise rounded-2xl p-5 mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="admin-panel-heading flex items-center gap-2">
                <Link2 size={14} /> Hubungkan Google Drive
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Sambungkan akun Google untuk mengunggah & mengunduh gambar order.
              </p>
            </div>
            <a href="/api/google/connect" className="admin-btn whitespace-nowrap">
              <Link2 size={14} /> Connect Google Account
            </a>
          </div>
        )}
        {justConnected && (
          <p className="admin-error mt-0 mb-4" style={{ color: "#15803d" }}>
            ✓ Google Drive terhubung.
          </p>
        )}
        {oauthError && (
          <p className="admin-error mb-4">⚠ Gagal menghubungkan Google ({oauthError}).</p>
        )}
        {error && <p className="admin-error mb-4">⚠ {error}</p>}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(["processing", "completed"] as OrderStatus[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={tab === t ? "admin-btn" : "admin-btn-ghost"}
            >
              {t === "processing" ? "Processing" : "Completed"} ({counts[t]})
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="admin-panel admin-rise rounded-2xl overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Tanggal</th>
                <th>Gambar</th>
                <th className="w-56"></th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="!text-center py-10 text-gray-400 italic">
                    Tidak ada order {tab === "processing" ? "diproses" : "selesai"}.
                  </td>
                </tr>
              ) : (
                visible.map((o) => (
                  <tr key={o.id}>
                    <td className="font-medium text-gray-800">{o.invoice_number}</td>
                    <td className="text-gray-600">{o.customer?.name}</td>
                    <td className="text-gray-600">{formatRupiah(o.total)}</td>
                    <td className="text-gray-600">{o.invoice_date}</td>
                    <td>
                      {o.image_drive_id ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                          <ImageIcon size={13} /> Ada
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-3 justify-end">
                        {/* Upload */}
                        <input
                          ref={(el) => {
                            if (o.id) fileInputs.current[o.id] = el;
                          }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUpload(o, f);
                            e.target.value = "";
                          }}
                        />
                        <button
                          onClick={() => o.id && fileInputs.current[o.id]?.click()}
                          disabled={!connected || busyId === o.id}
                          className="text-gray-400 hover:text-[#021d47] transition-colors disabled:opacity-40"
                          title={connected ? "Upload gambar" : "Hubungkan Google dulu"}
                        >
                          {busyId === o.id ? (
                            <span className="admin-spinner-xs" />
                          ) : (
                            <Upload size={15} />
                          )}
                        </button>
                        {/* Download */}
                        <a
                          href={o.image_drive_id ? `/api/orders/${o.id}/image` : undefined}
                          className={
                            o.image_drive_id
                              ? "text-gray-400 hover:text-[#021d47] transition-colors"
                              : "text-gray-300 pointer-events-none"
                          }
                          title="Download gambar"
                        >
                          <Download size={15} />
                        </a>
                        {/* Remove image */}
                        {o.image_drive_id && (
                          <button
                            onClick={() => handleRemoveImage(o)}
                            disabled={busyId === o.id}
                            className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-60"
                            title="Hapus gambar"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                        {/* Status toggle */}
                        <button
                          onClick={() => toggleStatus(o)}
                          disabled={busyId === o.id}
                          className="admin-btn-ghost !py-1 !px-2 text-xs"
                          title={o.status === "completed" ? "Kembalikan ke proses" : "Tandai selesai"}
                        >
                          {o.status === "completed" ? (
                            <>
                              <RotateCcw size={13} /> Proses
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={13} /> Selesai
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify type check + build**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm run build`
Expected: build succeeds; `/admin/queue`, `/api/google/connect`, `/api/google/callback`, `/api/orders/[id]/image` appear in the route list.

---

## Task 12: Manual end-to-end verification

**Prereqs (user actions):**
- Run `0003_order_queue.sql` in Supabase.
- Create the Google OAuth client (see spec section 6) and add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` to `.env.local`.

- [ ] **Step 1: Start the app**

Run: `npm run dev`

- [ ] **Step 2: Verify the checklist**

- Log in to `/admin`, open `/admin/queue`. Connect banner is visible.
- Click **Connect Google Account** → Google consent → redirected back with `?connected=1`; banner gone; a `Ruslie Spring Orders` folder exists in Drive.
- On a processing order, click **Upload**, pick an image → "Ada" indicator appears; file is in the Drive folder.
- Click **Download** → the original image downloads with its filename.
- Click **Selesai** → row moves to the Completed tab; reload confirms it persists.
- Click the image **trash** → indicator clears; file removed from Drive.

---

## Self-Review notes

- **Spec coverage:** data model (T1–T3), OAuth (T5–T7), image routes (T8), queue UI + tabs + banner + download (T10–T11), nav (T9), env/setup (T12). All spec sections covered.
- **Type consistency:** `OrderStatus` defined in T2 and used in T4/T11; `setOrderImage`/`clearOrderImage`/`updateOrderStatus` signatures defined in T4 match calls in T8/T11; `getAccessToken`/`ensureFolder`/`uploadImage`/`downloadImage`/`deleteImage`/`saveTokens`/`exchangeCode`/`buildConsentUrl`/`isConnected` defined in T5 match calls in T6/T7/T8/T10.
- **No placeholders:** every code step is complete.

# Order Queue + Google Drive Images — Design

**Date:** 2026-06-02
**Status:** Approved (pending spec review)

## Goal

Add an admin **Queue** page that manages orders by status (`processing` /
`completed`) and lets the admin **upload** an image per order to Google Drive and
**download** it back. Orders are the existing `transactions` records.

## Decisions (from brainstorming)

| Question | Decision |
| --- | --- |
| What is an "order" | Existing `transactions` rows + a `status` field |
| Image storage | Real Google Drive via **Google OAuth** (connect own account) |
| Images per order | **One** image per order |
| Queue layout | **Tabs: Processing \| Completed** |
| Download behaviour | **Download the file bytes** to the computer |
| Connect button | Banner on the **Queue page** |

## 1. Data model

New migration: `supabase/migrations/0003_order_queue.sql`.

Add to `public.transactions`:

```sql
alter table public.transactions
  add column if not exists status text not null default 'processing'
    check (status in ('processing','completed')),
  add column if not exists image_drive_id text,
  add column if not exists image_name text;

create index if not exists transactions_status_idx on public.transactions (status);
```

Single-row table for the Google connection (server-side secrets):

```sql
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

`lib/types.ts`: extend `Transaction` with:

```ts
status: "processing" | "completed";
image_drive_id?: string | null;
image_name?: string | null;
```

Add `export type OrderStatus = "processing" | "completed";`

## 2. Google OAuth flow

Scope: `https://www.googleapis.com/auth/drive.file` (app only accesses files it
creates — minimal, safe). `access_type=offline` + `prompt=consent` to obtain a
refresh token.

Routes (App Router route handlers):

- **`GET /api/google/connect`** — builds the Google consent URL and redirects.
- **`GET /api/google/callback`** — exchanges `code` for tokens. On first connect,
  creates a dedicated Drive folder named `Ruslie Spring Orders` and stores its
  ID. Persists `refresh_token`, `access_token`, `token_expiry`, `drive_folder_id`
  into the single `google_oauth` row. Redirects to `/admin/queue?connected=1`.

Server helper `lib/google.ts` (no new npm deps — plain `fetch`):

- `getStoredAuth(supabase)` — reads the `google_oauth` row.
- `getAccessToken(supabase)` — returns a valid access token, refreshing via the
  refresh token when `token_expiry` is past (and persisting the new token).
- `exchangeCode(code)` — token exchange used by the callback.
- `ensureFolder(token, supabase)` — returns the stored folder ID or creates it.
- `uploadImage(token, folderId, file)` — multipart upload, returns `{ id }`.
- `downloadImage(token, fileId)` — `GET files/{id}?alt=media`, returns a stream.
- `deleteImage(token, fileId)` — `DELETE files/{id}`.
- `isConnected(supabase)` — boolean for the banner.

Token endpoints used:
- Auth: `https://accounts.google.com/o/oauth2/v2/auth`
- Token: `https://oauth2.googleapis.com/token`
- Upload: `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`
- Files: `https://www.googleapis.com/drive/v3/files`

## 3. Image API routes

- **`POST /api/orders/[id]/image`** — reads multipart form file, gets access
  token, ensures folder, uploads, then updates the transaction row with
  `image_drive_id` + `image_name`. Returns the updated fields as JSON.
- **`GET /api/orders/[id]/image`** — looks up `image_drive_id`, streams bytes
  from Drive with `Content-Disposition: attachment; filename="<image_name>"` so
  the browser downloads it.
- **`DELETE /api/orders/[id]/image`** — deletes the Drive file and clears
  `image_drive_id` + `image_name` on the row.

All routes use the authenticated Supabase server client (`lib/supabase/server`)
and 401 if no session.

## 4. Queue page

`app/admin/queue/page.tsx` (server component) — fetches transactions via
`listTransactions` and `isConnected`, renders `components/QueueClient.tsx`.

`components/QueueClient.tsx` (client) — mirrors existing `CustomersClient`
patterns (`admin-shell`, `admin-panel`, `admin-table`, `admin-btn`, inline
spinners, optimistic updates):

- **Connect banner** at top, shown only when `!connected`, with a "Connect Google
  Account" link to `/api/google/connect`. Shows a success note when
  `?connected=1`.
- **Tabs: Processing | Completed** — filter the list by `status`; show a count
  badge per tab.
- **Table columns:** invoice #, customer name, total, date, image indicator,
  actions.
- **Actions per row:**
  - Status toggle button (processing ⇄ completed) → calls `updateOrderStatus`,
    optimistic move between tabs.
  - **Upload** — hidden `<input type="file" accept="image/*">`; on change POSTs
    to `/api/orders/[id]/image`; spinner while uploading; disabled if not
    connected.
  - **Download** — anchor to `GET /api/orders/[id]/image`; enabled only when the
    row has `image_drive_id`.
  - Optional **remove image** (trash icon) → DELETE route.

`AdminNav`: add `queue` to `AdminPage` union and a nav link
`{ key: "queue", href: "/admin/queue", label: "Queue", Icon: ListChecks }`.
Set `active="queue"` on the queue page.

## 5. lib helpers

- `lib/google.ts` — described in section 2 (server-only).
- `lib/orders.ts`:
  - `updateOrderStatus(supabase, id, status)` — patches `status`.
  - `setOrderImage(supabase, id, { image_drive_id, image_name })`.
  - `clearOrderImage(supabase, id)`.

## 6. Environment & setup (admin to do)

`.env.local` additions:

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
# Local dev:
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
# Production (rusliespring.com):
# GOOGLE_REDIRECT_URI=https://rusliespring.com/api/google/callback
```

`GOOGLE_REDIRECT_URI` must exactly match the value sent by `/api/google/connect`
and the value registered in the OAuth client. Use the localhost value in dev and
the `https://rusliespring.com/...` value in production.

Google Cloud Console steps:
1. Create / select a project.
2. APIs & Services → Enable **Google Drive API**.
3. OAuth consent screen → External → add yourself as a **Test user** (keeps it in
   testing mode, no verification needed for personal use).
4. Credentials → Create OAuth client ID → **Web application**.
5. Authorized redirect URIs (add both):
   `http://localhost:3000/api/google/callback` and
   `https://rusliespring.com/api/google/callback`.
6. Copy client ID/secret into `.env.local`.

Supabase: run `0003_order_queue.sql` in the SQL editor.

For production, set `GOOGLE_REDIRECT_URI` to the deployed callback URL and add it
to the OAuth client's authorized redirect URIs.

## Out of scope (YAGNI)

- Multiple images per order / gallery.
- Image preview thumbnails inline (only an indicator + download).
- Drag-and-drop kanban reordering.
- Sharing Drive files publicly.

## Testing

- Migration applies cleanly; existing transactions default to `processing`.
- OAuth round trip stores a refresh token and folder ID.
- Upload → row gets `image_drive_id`; file appears in the Drive folder.
- Download streams the correct bytes with the original filename.
- Status toggle moves a row between tabs and persists on reload.
- Banner hidden once connected; upload disabled until connected.

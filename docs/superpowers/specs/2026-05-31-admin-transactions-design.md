# Admin Transactions & Dashboard — Design Spec

**Date:** 2026-05-31
**Status:** Approved
**Scope:** Second sub-project of the admin system — transaction recording, customer
management, and the transaction dashboard. Builds on the admin auth foundation
(see `2026-05-31-admin-auth-design.md`).

## Background

The admin auth foundation is in place (`/admin` login, protected `/admin/*`). This phase
makes the admin area useful: record sales as saved **transactions**, manage **customers**,
and view a **dashboard**. It replaces the standalone invoice generator — the full invoice
(customer + line items + print) now lives inside the admin area and every invoice is saved.

## Decisions

- **Transaction content:** full invoice — customer + line items + shipping + payment method,
  still printable (Invoice / Surat Jalan / Label A6). Every save is recorded in Supabase.
- **Payment status:** none. We record the sale; no paid/unpaid concept.
- **Category (sales channel):** each transaction is `online` (Online Shop) or `direct`.
- **Wire catalog:** a `wires` table (name + wire type) and an editable `wire_types` table
  (seeded with `SUS304` and `BAJA`). Both managed at `/admin/wires`. When adding a line item
  on the transaction form you must **select a wire first**; that auto-fills the item name
  (still editable) and stores the `wire_id` on the line item. Qty and price are typed as today.
  **Print is unchanged** — invoice/surat jalan/label show the item name only, never wire/type.
- **Customers:** a `customers` table with full CRUD at `/admin/customers`. The transaction
  form has a searchable customer select that auto-fills the customer fields; all fields stay
  editable (edits affect only that transaction's snapshot). Newly-typed customers are saved
  to the list via an explicit "Save to customers" action (avoids accidental duplicates).
- **Dashboard:** summary stat cards, a revenue bar chart, and a searchable/filterable
  transaction list, with a channel (Online Shop vs Direct) breakdown.
- **Chart:** hand-rolled SVG bar chart — no new dependency.
- **Invoice QR seal ("digital sign"):** the Invoice document shows a QR code encoding the
  invoice number, with a caption: "Faktur sah dari Ruslie Spring" (valid invoice from Ruslie
  Spring). QR only on the Invoice (not Surat Jalan / Label). Rendered via `qrcode.react`.
- **Old generator:** the public `/invoice` route and its navbar link are removed.
  Calculator and landing page are untouched.

## Data Model (Supabase, Postgres)

Both tables have **Row Level Security** enabled with a policy allowing all actions for
authenticated users only (anonymous users get nothing).

### `customers`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk default `gen_random_uuid()` | |
| `created_at` | timestamptz default `now()` | |
| `name` | text not null | |
| `address` | text | |
| `city` | text | |
| `phone` | text | |

### `wire_types`
| Column | Type | Notes |
|---|---|---|
| `type_id` | uuid pk default `gen_random_uuid()` | |
| `created_at` | timestamptz default `now()` | |
| `name` | text not null unique | seeded: `SUS304`, `BAJA` |

### `wires`
| Column | Type | Notes |
|---|---|---|
| `wire_id` | uuid pk default `gen_random_uuid()` | |
| `created_at` | timestamptz default `now()` | |
| `name` | text not null | |
| `type_id` | uuid references `wire_types(type_id)` on delete set null | |

### `transactions`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk default `gen_random_uuid()` | |
| `created_at` | timestamptz default `now()` | |
| `invoice_date` | text | displayed date string (as today's generator) |
| `invoice_number` | text | e.g. `INV-260531-AB` |
| `channel` | text not null | `online` or `direct` |
| `customer_id` | uuid null references `customers(id)` on delete set null | optional link |
| `customer` | jsonb not null | snapshot `{name,address,city,phone}` |
| `items` | jsonb not null | `[{wire_id,name,qty,price}]` (wire_id links catalog; name is printed label) |
| `shipping` | numeric not null default 0 | |
| `payment_method` | text not null | `cash` or `top` |
| `top_note` | text | |
| `subtotal` | numeric not null | stored for SQL aggregation |
| `total` | numeric not null | stored for SQL aggregation |
| `sender_name` | text | for Surat Jalan |

Line items are JSONB inside the row (always loaded with the transaction — no join needed).
Totals are real columns so the dashboard aggregates efficiently. The customer is snapshotted
so historical invoices never change when a customer record is later edited.

The SQL (table creation + RLS policies) is delivered as a migration the user runs in the
Supabase SQL editor.

## Routes & Components

| Route | Type | Responsibility |
|---|---|---|
| `/admin/dashboard` | server | Stat cards, revenue chart, recent/filterable transaction list |
| `/admin/transactions/new` | server + client | Invoice form: create, save, print |
| `/admin/transactions/[id]` | server + client | View / edit / reprint / delete a saved transaction |
| `/admin/customers` | server + client | Customer CRUD table |
| `/admin/wires` | server + client | Wire CRUD + editable wire types |

| File | Responsibility |
|---|---|
| `lib/types.ts` | Shared TS types: `Customer`, `TransactionItem`, `Transaction`, `Channel` |
| `lib/transactions.ts` | Supabase data helpers: list, get, create, update, delete, aggregate |
| `lib/customers.ts` | Supabase data helpers: list, create, update, delete |
| `lib/wires.ts` | Supabase data helpers for wires and wire_types: list/create/update/delete |
| `components/TransactionForm.tsx` | The invoice form (adapted from `InvoiceClient`) + channel selector + customer select + Save; keeps the three print documents |
| `components/CustomerSelect.tsx` | Searchable customer picker that auto-fills + stays editable |
| `components/WireSelect.tsx` | Wire picker for the add-item row; auto-fills item name |
| `components/WiresClient.tsx` | Wire CRUD UI + editable wire types |
| `lib/types.ts` adds | `WireType`, `Wire`; `TransactionItem` gains `wire_id` |
| `components/DashboardClient.tsx` | Stat cards, SVG bar chart, transaction table with search + date filter |
| `components/CustomersClient.tsx` | Customer CRUD table UI |
| `components/RevenueBarChart.tsx` | Dependency-free SVG bar chart |
| `components/InvoiceQrSeal.tsx` | QR code (invoice number) + "Faktur sah dari Ruslie Spring" caption, shown on the Invoice document |
| `app/admin/dashboard/page.tsx` | Replaces the placeholder; loads aggregates + recent rows |

The print logic, styling, and the three documents (Invoice, Surat Jalan, Label A6) are
preserved from the existing `InvoiceClient.tsx`, which is then removed along with
`app/invoice/page.tsx` and the navbar `/invoice` link.

## Data Flow

- **Create:** fill form → optionally pick/save a customer → **Save** → insert into
  `transactions` (compute `subtotal`/`total`, snapshot customer) → confirmation → redirect to
  `/admin/transactions/[id]`. Print buttons work before or after saving.
- **Edit:** load by `id` → change fields → **Save** → update row.
- **Delete:** confirm → delete row → back to dashboard.
- **Dashboard:** server component reads aggregates (sum `total` overall, this-month, by
  channel; count) and recent rows; client component handles search + date filtering + chart.
- **Customers:** list/add/edit/delete via `lib/customers.ts`.
- **Wires:** list/add/edit/delete wires and wire types via `lib/wires.ts`. The transaction
  form loads wires; the add-item row requires selecting a wire (sets `wire_id` + item name).

## Error Handling

- Supabase/network errors surface as an inline message; the form keeps entered data.
- Required-field validation before save (at least one item; customer name present; channel chosen).
- Empty dashboard/customers states show a friendly "nothing yet" message.

## Testing / Verification

- `npx tsc --noEmit` clean.
- Manual: run migration; create a customer; create a transaction picking that customer
  (fields auto-fill and remain editable); save; confirm it appears in the dashboard with
  correct total and channel; filter/search the list; reprint from `[id]`; edit; delete;
  confirm `/invoice` is gone (404 or redirect) and the navbar no longer links to it.

## Dependencies

- `qrcode.react` — renders the invoice QR seal as a print-friendly SVG.

## Out of Scope (later)

- Product catalog / inventory.
- Payment status, receivables, partial payments.
- Multi-user roles/permissions, audit log.
- CSV export, advanced charts/date grouping beyond per-month revenue.

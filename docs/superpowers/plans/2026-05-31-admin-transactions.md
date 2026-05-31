# Admin Transactions & Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Git policy for this project:** The user has instructed **never commit to git**. This plan contains **no commit steps**. Each task ends with a verification checkpoint. Leave all staging/committing to the user.

**Goal:** Record full invoices as saved Supabase transactions with a customer directory and a transaction dashboard, plus a QR "valid invoice" seal — replacing the standalone invoice generator.

**Architecture:** Two Supabase tables (`customers`, `transactions`) with RLS for authenticated users. Pure data-helper modules take a Supabase client so server components read and client components write. The invoice UI moves into `/admin/transactions/*`, adapted from the existing `InvoiceClient` (all print logic preserved), gaining a channel selector, a customer picker, a Save action, and a QR seal. The dashboard computes stats/chart/list client-side from fetched rows.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind, framer-motion, `@supabase/ssr` + `@supabase/supabase-js`, `qrcode.react`. Path alias `@/*` → project root. Brand: navy `#021d47`, Playfair Display + DM Sans.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `supabase/migrations/0001_transactions.sql` | Table + RLS DDL the user runs in the Supabase SQL editor |
| `lib/types.ts` | Shared types: `Channel`, `Customer`, `TransactionItem`, `Transaction` |
| `lib/customers.ts` | Customer data helpers (take a `SupabaseClient`) |
| `lib/transactions.ts` | Transaction data helpers (take a `SupabaseClient`) |
| `lib/wires.ts` | Wire + wire-type data helpers (take a `SupabaseClient`) |
| `components/InvoiceQrSeal.tsx` | QR of invoice number + validity caption |
| `components/CustomerSelect.tsx` | Searchable customer picker that auto-fills |
| `components/WireSelect.tsx` | Wire picker for the add-item row; auto-fills item name |
| `components/WiresClient.tsx` | Wire CRUD + editable wire types |
| `app/admin/wires/page.tsx` | Server page: load wires + types → render CRUD |
| `components/TransactionForm.tsx` | Invoice form (adapted from `InvoiceClient`) + channel + customer + Save + print |
| `components/RevenueBarChart.tsx` | Dependency-free SVG bar chart |
| `components/DashboardClient.tsx` | Stat cards + chart + searchable/filterable list |
| `components/CustomersClient.tsx` | Customer CRUD table |
| `app/admin/transactions/new/page.tsx` | Server page: load customers → render form |
| `app/admin/transactions/[id]/page.tsx` | Server page: load transaction + customers → render form |
| `app/admin/customers/page.tsx` | Server page: load customers → render CRUD |
| `app/admin/dashboard/page.tsx` | Server page: load transactions → render dashboard (replaces placeholder) |
| `app/invoice/page.tsx` | **Deleted** |
| `components/InvoiceClient.tsx` | **Deleted** (logic preserved in `TransactionForm`) |

---

## Task 1: Database migration (tables + RLS)

**Files:**
- Create: `supabase/migrations/0001_transactions.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0001_transactions.sql`:
```sql
-- Customers directory
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  address text,
  city text,
  phone text
);

-- Wire types (editable; seeded with SUS304 and BAJA)
create table if not exists public.wire_types (
  type_id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null unique
);

insert into public.wire_types (name)
values ('SUS304'), ('BAJA')
on conflict (name) do nothing;

-- Wire catalog
create table if not exists public.wires (
  wire_id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  type_id uuid references public.wire_types(type_id) on delete set null
);

-- Recorded transactions (full invoice snapshot)
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  invoice_date text,
  invoice_number text,
  channel text not null check (channel in ('online','direct')),
  customer_id uuid references public.customers(id) on delete set null,
  customer jsonb not null,
  items jsonb not null,
  shipping numeric not null default 0,
  payment_method text not null check (payment_method in ('cash','top')),
  top_note text,
  subtotal numeric not null default 0,
  total numeric not null default 0,
  sender_name text
);

create index if not exists transactions_created_at_idx on public.transactions (created_at desc);

-- Row Level Security: authenticated users only
alter table public.customers enable row level security;
alter table public.transactions enable row level security;
alter table public.wire_types enable row level security;
alter table public.wires enable row level security;

create policy "authenticated full access to customers"
  on public.customers for all
  to authenticated using (true) with check (true);

create policy "authenticated full access to transactions"
  on public.transactions for all
  to authenticated using (true) with check (true);

create policy "authenticated full access to wire_types"
  on public.wire_types for all
  to authenticated using (true) with check (true);

create policy "authenticated full access to wires"
  on public.wires for all
  to authenticated using (true) with check (true);
```

- [ ] **Step 2: User runs it**

Tell the user: open Supabase dashboard → SQL Editor → paste the file contents → Run.
Expected: "Success. No rows returned." Two tables appear under Table Editor with RLS enabled.

**Checkpoint:** `customers` and `transactions` exist with RLS policies. (No code to type-check yet.)

---

## Task 2: Shared types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Create types**

Create `lib/types.ts`:
```ts
export type Channel = "online" | "direct";
export type PaymentMethod = "cash" | "top";

export interface Customer {
  id?: string;
  created_at?: string;
  name: string;
  address: string;
  city: string;
  phone: string;
}

export interface WireType {
  type_id?: string;
  created_at?: string;
  name: string;
}

export interface Wire {
  wire_id?: string;
  created_at?: string;
  name: string;
  type_id?: string | null;
}

export interface TransactionItem {
  wire_id?: string | null;
  name: string;
  qty: number;
  price: number;
}

export interface Transaction {
  id?: string;
  created_at?: string;
  invoice_date: string;
  invoice_number: string;
  channel: Channel;
  customer_id?: string | null;
  customer: { name: string; address: string; city: string; phone: string };
  items: TransactionItem[];
  shipping: number;
  payment_method: PaymentMethod;
  top_note: string;
  subtotal: number;
  total: number;
  sender_name: string;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

**Checkpoint:** Types compile and are importable as `@/lib/types`.

---

## Task 3: Customer data helpers

**Files:**
- Create: `lib/customers.ts`

- [ ] **Step 1: Create helpers**

These are pure functions taking a Supabase client, so server components and client
components can both call them with their respective clients.

Create `lib/customers.ts`:
```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Customer } from "./types";

export async function listCustomers(
  supabase: SupabaseClient
): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Customer[];
}

export async function createCustomer(
  supabase: SupabaseClient,
  customer: Omit<Customer, "id" | "created_at">
): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .insert(customer)
    .select()
    .single();
  if (error) throw error;
  return data as Customer;
}

export async function updateCustomer(
  supabase: SupabaseClient,
  id: string,
  customer: Omit<Customer, "id" | "created_at">
): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .update(customer)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Customer;
}

export async function deleteCustomer(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

**Checkpoint:** Customer CRUD helpers compile.

---

## Task 4: Transaction data helpers

**Files:**
- Create: `lib/transactions.ts`

- [ ] **Step 1: Create helpers**

Create `lib/transactions.ts`:
```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Transaction } from "./types";

export async function listTransactions(
  supabase: SupabaseClient
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Transaction[];
}

export async function getTransaction(
  supabase: SupabaseClient,
  id: string
): Promise<Transaction | null> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Transaction) ?? null;
}

export async function createTransaction(
  supabase: SupabaseClient,
  txn: Omit<Transaction, "id" | "created_at">
): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .insert(txn)
    .select()
    .single();
  if (error) throw error;
  return data as Transaction;
}

export async function updateTransaction(
  supabase: SupabaseClient,
  id: string,
  txn: Omit<Transaction, "id" | "created_at">
): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .update(txn)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Transaction;
}

export async function deleteTransaction(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

**Checkpoint:** Transaction helpers compile.

---

## Task 4b: Wire & wire-type data helpers

**Files:**
- Create: `lib/wires.ts`

- [ ] **Step 1: Create helpers**

Create `lib/wires.ts`:
```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Wire, WireType } from "./types";

/* ── Wire types ── */
export async function listWireTypes(
  supabase: SupabaseClient
): Promise<WireType[]> {
  const { data, error } = await supabase
    .from("wire_types")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WireType[];
}

export async function createWireType(
  supabase: SupabaseClient,
  name: string
): Promise<WireType> {
  const { data, error } = await supabase
    .from("wire_types")
    .insert({ name })
    .select()
    .single();
  if (error) throw error;
  return data as WireType;
}

export async function updateWireType(
  supabase: SupabaseClient,
  typeId: string,
  name: string
): Promise<WireType> {
  const { data, error } = await supabase
    .from("wire_types")
    .update({ name })
    .eq("type_id", typeId)
    .select()
    .single();
  if (error) throw error;
  return data as WireType;
}

export async function deleteWireType(
  supabase: SupabaseClient,
  typeId: string
): Promise<void> {
  const { error } = await supabase.from("wire_types").delete().eq("type_id", typeId);
  if (error) throw error;
}

/* ── Wires ── */
export async function listWires(supabase: SupabaseClient): Promise<Wire[]> {
  const { data, error } = await supabase
    .from("wires")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Wire[];
}

export async function createWire(
  supabase: SupabaseClient,
  wire: Omit<Wire, "wire_id" | "created_at">
): Promise<Wire> {
  const { data, error } = await supabase
    .from("wires")
    .insert(wire)
    .select()
    .single();
  if (error) throw error;
  return data as Wire;
}

export async function updateWire(
  supabase: SupabaseClient,
  wireId: string,
  wire: Omit<Wire, "wire_id" | "created_at">
): Promise<Wire> {
  const { data, error } = await supabase
    .from("wires")
    .update(wire)
    .eq("wire_id", wireId)
    .select()
    .single();
  if (error) throw error;
  return data as Wire;
}

export async function deleteWire(
  supabase: SupabaseClient,
  wireId: string
): Promise<void> {
  const { error } = await supabase.from("wires").delete().eq("wire_id", wireId);
  if (error) throw error;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

**Checkpoint:** Wire and wire-type helpers compile.

---

## Task 5: QR seal component

**Files:**
- Modify: `package.json` (via install)
- Create: `components/InvoiceQrSeal.tsx`

- [ ] **Step 1: Install qrcode.react**

Run: `npm install qrcode.react`
Expected: `qrcode.react` added to dependencies, no errors.

- [ ] **Step 2: Create the seal**

Create `components/InvoiceQrSeal.tsx`:
```tsx
import { QRCodeSVG } from "qrcode.react";

export default function InvoiceQrSeal({
  invoiceNumber,
}: {
  invoiceNumber: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <QRCodeSVG value={invoiceNumber || "INV"} size={72} level="M" />
      <p className="text-[0.6rem] text-gray-500 text-center leading-tight max-w-[120px]">
        Faktur sah dari <span className="font-semibold">Ruslie Spring</span>
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

**Checkpoint:** QR seal renders an SVG QR of the invoice number with the validity caption.

---

## Task 6: Customer picker

**Files:**
- Create: `components/CustomerSelect.tsx`

The picker is a `<select>` of saved customers. Choosing one calls `onSelect` with the full
customer so the parent auto-fills its editable fields. Choosing the blank option clears the
link but leaves typed fields untouched (parent decides). It is intentionally simple — the
form's own inputs remain the source of truth and stay editable.

- [ ] **Step 1: Create the component**

Create `components/CustomerSelect.tsx`:
```tsx
"use client";

import type { Customer } from "@/lib/types";

export default function CustomerSelect({
  customers,
  value,
  onSelect,
}: {
  customers: Customer[];
  value: string | null | undefined;
  onSelect: (customer: Customer | null) => void;
}) {
  return (
    <div className="col-span-2">
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
        Pilih Customer (opsional)
      </label>
      <select
        value={value ?? ""}
        onChange={(e) => {
          const picked = customers.find((c) => c.id === e.target.value) ?? null;
          onSelect(picked);
        }}
        className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:border-blue-400 transition-colors no-print"
      >
        <option value="">— Customer baru / ketik manual —</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.city ? ` — ${c.city}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

**Checkpoint:** Picker compiles; emits the chosen customer (or null).

---

## Task 6b: Wire picker

**Files:**
- Create: `components/WireSelect.tsx`

A `<select>` of wires for the add-item row. Choosing one emits the full wire so the parent
can set the item's `wire_id` and auto-fill its (still-editable) name.

- [ ] **Step 1: Create the component**

Create `components/WireSelect.tsx`:
```tsx
"use client";

import type { Wire } from "@/lib/types";

export default function WireSelect({
  wires,
  value,
  onSelect,
}: {
  wires: Wire[];
  value: string | null | undefined;
  onSelect: (wire: Wire | null) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => {
        const picked = wires.find((w) => w.wire_id === e.target.value) ?? null;
        onSelect(picked);
      }}
      className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-400 transition-colors"
    >
      <option value="">— Pilih Wire —</option>
      {wires.map((w) => (
        <option key={w.wire_id} value={w.wire_id}>
          {w.name}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

**Checkpoint:** Wire picker compiles; emits the chosen wire (or null).

---

## Task 7: Transaction form (adapt InvoiceClient)

**Files:**
- Create: `components/TransactionForm.tsx` (copied from `components/InvoiceClient.tsx`, then edited)

This task copies the existing, working invoice UI (all print logic, the three documents, and
print styles) and layers on: edit-mode init, channel selector, customer picker, QR seal, a
Save action, and admin navigation. Do the edits in order.

- [ ] **Step 1: Copy the file**

Run (PowerShell): `Copy-Item components/InvoiceClient.tsx components/TransactionForm.tsx`
Expected: `components/TransactionForm.tsx` exists, identical to `InvoiceClient.tsx`.

- [ ] **Step 2: Replace the import block**

In `components/TransactionForm.tsx`, replace the top import block:
```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Home,
  FileText,
  Plus,
  Trash2,
  Printer,
  Calculator,
  ChevronDown,
} from "lucide-react";
```
with:
```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Home, FileText, Plus, Trash2, Printer, Save, Users, Cable } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createTransaction, updateTransaction } from "@/lib/transactions";
import { createCustomer } from "@/lib/customers";
import type { Customer, Channel, Transaction, Wire } from "@/lib/types";
import CustomerSelect from "@/components/CustomerSelect";
import WireSelect from "@/components/WireSelect";
import InvoiceQrSeal from "@/components/InvoiceQrSeal";
```

- [ ] **Step 3: Replace the local `Customer` interface and component signature/state init**

Replace the local interface block:
```tsx
interface Customer {
  name: string;
  address: string;
  city: string;
  phone: string;
}
```
with (the shared `Customer` type is now imported; this local shape is the form's customer subset):
```tsx
type CustomerFields = { name: string; address: string; city: string; phone: string };
```

Also add `wire_id` to the local item interface. Replace:
```tsx
interface InvoiceItem {
  name: string;
  qty: number;
  price: number;
}
```
with:
```tsx
interface InvoiceItem {
  wire_id?: string | null;
  name: string;
  qty: number;
  price: number;
}
```

Then in `InvoiceState`, change `customer: Customer;` to `customer: CustomerFields;` and add a channel field. Replace:
```tsx
interface InvoiceState {
  date: string;
  number: string;
  customer: Customer;
  items: InvoiceItem[];
  shipping: number;
  paymentMethod: "cash" | "top";
  topNote: string;
}
```
with:
```tsx
interface InvoiceState {
  date: string;
  number: string;
  channel: Channel;
  customer: CustomerFields;
  items: InvoiceItem[];
  shipping: number;
  paymentMethod: "cash" | "top";
  topNote: string;
}
```

- [ ] **Step 4: Replace the component declaration and initial state**

Replace:
```tsx
export default function InvoiceClient() {
  const [invoice, setInvoice] = useState<InvoiceState>({
    date: todayFormatted(),
    number: "INV-",
    customer: {
      name: "PT. KOBEXINDO EQUIPMENT",
      address: "Jl. Raya Bekasi Karawang, KM 58 Lemahabang, Cikarang",
      city: "Bekasi, Jawa Barat",
      phone: "085218282583",
    },
    items: [],
    shipping: 0,
    paymentMethod: "cash",
    topNote: "",
  });

  const [newItem, setNewItem] = useState<InvoiceItem>({ name: "", qty: 0, price: 0 });
  const [itemError, setItemError] = useState("");
  const [senderName, setSenderName] = useState("");
```
with:
```tsx
export default function TransactionForm({
  initialCustomers,
  initialWires,
  existing,
}: {
  initialCustomers: Customer[];
  initialWires: Wire[];
  existing?: Transaction;
}) {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [wires] = useState<Wire[]>(initialWires);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    existing?.customer_id ?? null
  );
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveCustomer, setSaveCustomer] = useState(false);

  const [invoice, setInvoice] = useState<InvoiceState>({
    date: existing?.invoice_date ?? todayFormatted(),
    number: existing?.invoice_number ?? "INV-",
    channel: existing?.channel ?? "direct",
    customer: existing?.customer ?? { name: "", address: "", city: "", phone: "" },
    items: existing?.items ?? [],
    shipping: existing?.shipping ?? 0,
    paymentMethod: existing?.payment_method ?? "cash",
    topNote: existing?.top_note ?? "",
  });

  const [newItem, setNewItem] = useState<InvoiceItem>({ wire_id: "", name: "", qty: 0, price: 0 });
  const [itemError, setItemError] = useState("");
  const [senderName, setSenderName] = useState(existing?.sender_name ?? "");
```

- [ ] **Step 5: Only auto-generate the invoice number for NEW transactions**

Replace:
```tsx
  // set invoice number on mount
  useEffect(() => {
    setInvoice((p) => ({ ...p, number: "INV-" + getFormattedInvoiceNumber() }));
  }, []);
```
with:
```tsx
  // Auto-generate an invoice number only when creating a new transaction.
  useEffect(() => {
    if (!existing) {
      setInvoice((p) => ({ ...p, number: "INV-" + getFormattedInvoiceNumber() }));
    }
  }, [existing]);
```

- [ ] **Step 6: Add the save handler**

Immediately after the `removeItem` function, add:
```tsx
  function handleSelectCustomer(c: Customer | null) {
    setSelectedCustomerId(c?.id ?? null);
    if (c) {
      setInvoice((p) => ({
        ...p,
        customer: {
          name: c.name ?? "",
          address: c.address ?? "",
          city: c.city ?? "",
          phone: c.phone ?? "",
        },
      }));
    }
  }

  async function handleSave() {
    setSaveError("");
    if (!invoice.customer.name.trim()) {
      setSaveError("Nama customer wajib diisi.");
      return;
    }
    if (invoice.items.length === 0) {
      setSaveError("Tambahkan minimal satu item.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    let customerId = selectedCustomerId;

    try {
      if (saveCustomer && !customerId) {
        const created = await createCustomer(supabase, {
          name: invoice.customer.name,
          address: invoice.customer.address,
          city: invoice.customer.city,
          phone: invoice.customer.phone,
        });
        customerId = created.id ?? null;
        setCustomers((prev) => [...prev, created]);
        setSelectedCustomerId(customerId);
      }

      const payload = {
        invoice_date: invoice.date,
        invoice_number: invoice.number,
        channel: invoice.channel,
        customer_id: customerId,
        customer: invoice.customer,
        items: invoice.items,
        shipping: invoice.shipping || 0,
        payment_method: invoice.paymentMethod,
        top_note: invoice.topNote,
        subtotal,
        total,
        sender_name: senderName,
      };

      const saved = existing?.id
        ? await updateTransaction(supabase, existing.id, payload)
        : await createTransaction(supabase, payload);

      setSaving(false);
      router.push(`/admin/transactions/${saved.id}`);
      router.refresh();
    } catch {
      setSaving(false);
      setSaveError("Gagal menyimpan. Periksa koneksi lalu coba lagi.");
    }
  }
```

- [ ] **Step 6b: Require a wire on add-item + add the wire handler**

Replace the copied `addItem` function:
```tsx
  function addItem() {
    if (!newItem.name.trim()) { setItemError("Item name is required"); return; }
    if (!newItem.qty || newItem.qty <= 0) { setItemError("Qty must be > 0"); return; }
    if (!newItem.price || newItem.price <= 0) { setItemError("Price must be > 0"); return; }
    setInvoice((p) => ({ ...p, items: [...p.items, { ...newItem }] }));
    setNewItem({ name: "", qty: 0, price: 0 });
    setItemError("");
  }
```
with (requires a selected wire; resets the wire picker after adding):
```tsx
  function handleSelectWire(w: Wire | null) {
    setSelectedWireId(w?.wire_id ?? null);
    setNewItem((p) => ({ ...p, wire_id: w?.wire_id ?? "", name: w ? w.name : p.name }));
    setItemError("");
  }

  function addItem() {
    if (!newItem.wire_id) { setItemError("Pilih wire terlebih dahulu"); return; }
    if (!newItem.name.trim()) { setItemError("Item name is required"); return; }
    if (!newItem.qty || newItem.qty <= 0) { setItemError("Qty must be > 0"); return; }
    if (!newItem.price || newItem.price <= 0) { setItemError("Price must be > 0"); return; }
    setInvoice((p) => ({ ...p, items: [...p.items, { ...newItem }] }));
    setNewItem({ wire_id: "", name: "", qty: 0, price: 0 });
    setSelectedWireId(null);
    setItemError("");
  }
```

- [ ] **Step 6c: Add the WireSelect to the add-item form**

In the "ADD ITEM FORM" block, replace the grid opening and the item-name input:
```tsx
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <input
                  value={newItem.name}
                  onChange={(e) => { setNewItem((p) => ({ ...p, name: e.target.value })); setItemError(""); }}
                  placeholder="Item name"
                  className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-400 transition-colors"
                  onKeyDown={(e) => e.key === "Enter" && addItem()}
                />
```
with (the wire picker spans the row above the name; the name still auto-fills and stays editable):
```tsx
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <WireSelect
                  wires={wires}
                  value={selectedWireId}
                  onSelect={handleSelectWire}
                />
                <input
                  value={newItem.name}
                  onChange={(e) => { setNewItem((p) => ({ ...p, name: e.target.value })); setItemError(""); }}
                  placeholder="Item name"
                  className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-400 transition-colors"
                  onKeyDown={(e) => e.key === "Enter" && addItem()}
                />
```

- [ ] **Step 7: Replace the navbar links**

Replace the navbar inner links block:
```tsx
        <div className="flex items-center gap-5">
          <Link href="/" className="hidden sm:flex items-center gap-1.5 text-white/55 hover:text-white text-[0.78rem] tracking-widest uppercase transition-colors">
            <Home size={12} /> Home
          </Link>
          <Link href="/calculator" className="hidden sm:flex items-center gap-1.5 text-white/55 hover:text-white text-[0.78rem] tracking-widest uppercase transition-colors">
            <Calculator size={12} /> Calculator
          </Link>
          <span className="text-white text-[0.78rem] tracking-widest uppercase flex items-center gap-1.5">
            <FileText size={12} /> Invoice
          </span>
        </div>
```
with:
```tsx
        <div className="flex items-center gap-5">
          <Link href="/admin/dashboard" className="hidden sm:flex items-center gap-1.5 text-white/55 hover:text-white text-[0.78rem] tracking-widest uppercase transition-colors">
            <Home size={12} /> Dashboard
          </Link>
          <Link href="/admin/customers" className="hidden sm:flex items-center gap-1.5 text-white/55 hover:text-white text-[0.78rem] tracking-widest uppercase transition-colors">
            <Users size={12} /> Customers
          </Link>
          <Link href="/admin/wires" className="hidden sm:flex items-center gap-1.5 text-white/55 hover:text-white text-[0.78rem] tracking-widest uppercase transition-colors">
            <Cable size={12} /> Wires
          </Link>
          <span className="text-white text-[0.78rem] tracking-widest uppercase flex items-center gap-1.5">
            <FileText size={12} /> Transaction
          </span>
        </div>
```

- [ ] **Step 8: Update the page hero heading text**

Replace:
```tsx
            <h1
              className="text-white text-[clamp(1.7rem,4vw,2.4rem)] font-bold"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Invoice <span className="text-gray-300">Generator</span>
            </h1>
            <p className="text-white/40 text-sm mt-1">Fill in the details below, then print or save as PDF.</p>
```
with:
```tsx
            <h1
              className="text-white text-[clamp(1.7rem,4vw,2.4rem)] font-bold"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {existing ? "Edit" : "New"} <span className="text-gray-300">Transaction</span>
            </h1>
            <p className="text-white/40 text-sm mt-1">Isi detail, simpan ke database, lalu cetak.</p>
```

- [ ] **Step 9: Add the QR seal to the invoice document header**

In the invoice document (the `doc-invoice` block), replace the header's invoice-number area.
Replace:
```tsx
              <div className="text-right text-sm leading-7 text-gray-600">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-gray-400">Date:</span>
                  <input
                    value={invoice.date}
                    onChange={(e) => setInvoice((p) => ({ ...p, date: e.target.value }))}
                    className="print-input border-b border-dashed border-gray-300 bg-transparent text-right text-sm text-gray-700 focus:outline-none focus:border-gray-500 w-40"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 mt-1">
                  <span className="text-gray-400">Invoice No:</span>
                  <input
                    value={invoice.number}
                    onChange={(e) => setInvoice((p) => ({ ...p, number: e.target.value }))}
                    className="print-input border-b border-dashed border-gray-300 bg-transparent text-right text-sm font-semibold text-gray-700 focus:outline-none focus:border-gray-500 w-40"
                  />
                </div>
              </div>
```
with:
```tsx
              <div className="flex items-start gap-4">
                <div className="text-right text-sm leading-7 text-gray-600">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-gray-400">Date:</span>
                    <input
                      value={invoice.date}
                      onChange={(e) => setInvoice((p) => ({ ...p, date: e.target.value }))}
                      className="print-input border-b border-dashed border-gray-300 bg-transparent text-right text-sm text-gray-700 focus:outline-none focus:border-gray-500 w-40"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <span className="text-gray-400">Invoice No:</span>
                    <input
                      value={invoice.number}
                      onChange={(e) => setInvoice((p) => ({ ...p, number: e.target.value }))}
                      className="print-input border-b border-dashed border-gray-300 bg-transparent text-right text-sm font-semibold text-gray-700 focus:outline-none focus:border-gray-500 w-40"
                    />
                  </div>
                </div>
                <InvoiceQrSeal invoiceNumber={invoice.number} />
              </div>
```

- [ ] **Step 10: Add the customer picker + channel selector into the Bill To block**

In the Bill To block, replace the opening of the grid:
```tsx
              <p className="font-semibold text-[#021d47] text-sm mb-3">Bill To:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <input
                  value={invoice.customer.name}
                  onChange={(e) => setCustomer("name", e.target.value)}
                  placeholder="Customer Name"
                  className="print-input col-span-2 border border-blue-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white/70 focus:outline-none focus:border-blue-400 transition-colors"
                />
```
with:
```tsx
              <p className="font-semibold text-[#021d47] text-sm mb-3">Bill To:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <CustomerSelect
                  customers={customers}
                  value={selectedCustomerId}
                  onSelect={handleSelectCustomer}
                />
                <label className="col-span-2 flex items-center gap-2 text-xs text-gray-500 no-print">
                  <input
                    type="checkbox"
                    checked={saveCustomer}
                    onChange={(e) => setSaveCustomer(e.target.checked)}
                    className="accent-[#021d47]"
                    disabled={!!selectedCustomerId}
                  />
                  Simpan customer baru ke daftar
                </label>
                <input
                  value={invoice.customer.name}
                  onChange={(e) => setCustomer("name", e.target.value)}
                  placeholder="Customer Name"
                  className="print-input col-span-2 border border-blue-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white/70 focus:outline-none focus:border-blue-400 transition-colors"
                />
```

- [ ] **Step 11: Add the channel selector after the payment method block**

Find the end of the payment-method `<div className="mt-4 pt-4 border-t border-blue-200/60">` section (it closes right before the Bill To block's closing `</div>`). Directly after that payment-method section's closing `</div>`, add:
```tsx
              {/* Sales channel */}
              <div className="mt-4 pt-4 border-t border-blue-200/60 no-print">
                <p className="font-semibold text-[#021d47] text-sm mb-2">Kategori Transaksi</p>
                <div className="flex items-center gap-5 text-sm">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="channel"
                      checked={invoice.channel === "direct"}
                      onChange={() => setInvoice((p) => ({ ...p, channel: "direct" }))}
                      className="accent-[#021d47]"
                    />
                    <span className={invoice.channel === "direct" ? "font-semibold text-[#021d47]" : "text-gray-500"}>
                      Direct
                    </span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="channel"
                      checked={invoice.channel === "online"}
                      onChange={() => setInvoice((p) => ({ ...p, channel: "online" }))}
                      className="accent-[#021d47]"
                    />
                    <span className={invoice.channel === "online" ? "font-semibold text-[#021d47]" : "text-gray-500"}>
                      Online Shop
                    </span>
                  </label>
                </div>
              </div>
```

- [ ] **Step 12: Add the Save button + save error to the print-button row**

Replace the start of the print button row:
```tsx
            <div className="print-btn-row no-print relative z-10 mt-6 flex flex-wrap justify-center gap-3">
              <motion.button
                onClick={() => window.print()}
```
with:
```tsx
            {saveError && (
              <p className="no-print text-red-500 text-sm text-center mt-6">⚠ {saveError}</p>
            )}
            <div className="print-btn-row no-print relative z-10 mt-6 flex flex-wrap justify-center gap-3">
              <motion.button
                onClick={handleSave}
                disabled={saving}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 text-white font-semibold px-7 py-3 rounded-xl text-sm tracking-wide disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                  border: "none",
                  cursor: saving ? "default" : "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <Save size={16} />
                {saving ? "Menyimpan…" : existing ? "Update" : "Simpan Transaksi"}
              </motion.button>
              <motion.button
                onClick={() => window.print()}
```

- [ ] **Step 13: Repoint the "New Invoice" reset button**

Replace the reset button's onClick body and label. Replace:
```tsx
              <motion.button
                onClick={() => {
                  setInvoice((p) => ({
                    ...p,
                    items: [],
                    shipping: 0,
                    topNote: "",
                    paymentMethod: "cash",
                    number: "INV-" + getFormattedInvoiceNumber(),
                    customer: { name: "", address: "", city: "", phone: "" },
                  }));
                  setSenderName("");
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 text-gray-500 font-medium px-5 py-3 rounded-xl text-sm border transition-colors hover:text-gray-700"
                style={{
                  background: "#f8fafc",
                  border: "1.5px solid rgba(2,29,71,0.12)",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                New Invoice
              </motion.button>
```
with:
```tsx
              <motion.button
                onClick={() => router.push("/admin/transactions/new")}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 text-gray-500 font-medium px-5 py-3 rounded-xl text-sm border transition-colors hover:text-gray-700"
                style={{
                  background: "#f8fafc",
                  border: "1.5px solid rgba(2,29,71,0.12)",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                New Transaction
              </motion.button>
```

- [ ] **Step 14: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. If an unused-import error appears for `getFormattedInvoiceNumber`, leave it — it is still used by the new-number effect (Step 5).

**Checkpoint:** `TransactionForm` compiles with channel, customer picker, QR seal, and Save.

---

## Task 8: Transaction pages (new + edit)

**Files:**
- Create: `app/admin/transactions/new/page.tsx`
- Create: `app/admin/transactions/[id]/page.tsx`

- [ ] **Step 1: New transaction page**

Create `app/admin/transactions/new/page.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import { listCustomers } from "@/lib/customers";
import { listWires } from "@/lib/wires";
import TransactionForm from "@/components/TransactionForm";

export const metadata = { title: "New Transaction — Ruslie Spring Admin" };

export default async function NewTransactionPage() {
  const supabase = createClient();
  const [customers, wires] = await Promise.all([
    listCustomers(supabase),
    listWires(supabase),
  ]);
  return <TransactionForm initialCustomers={customers} initialWires={wires} />;
}
```

- [ ] **Step 2: Edit/view transaction page**

Create `app/admin/transactions/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTransaction } from "@/lib/transactions";
import { listCustomers } from "@/lib/customers";
import { listWires } from "@/lib/wires";
import TransactionForm from "@/components/TransactionForm";

export const metadata = { title: "Transaction — Ruslie Spring Admin" };

export default async function TransactionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const [txn, customers, wires] = await Promise.all([
    getTransaction(supabase, params.id),
    listCustomers(supabase),
    listWires(supabase),
  ]);
  if (!txn) notFound();
  return (
    <TransactionForm initialCustomers={customers} initialWires={wires} existing={txn} />
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

**Checkpoint:** `/admin/transactions/new` and `/admin/transactions/[id]` compile.

---

## Task 9: Revenue bar chart

**Files:**
- Create: `components/RevenueBarChart.tsx`

- [ ] **Step 1: Create the chart**

Create `components/RevenueBarChart.tsx`:
```tsx
"use client";

export interface BarDatum {
  label: string;
  value: number;
}

function formatShort(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}jt`;
  if (val >= 1_000) return `${Math.round(val / 1_000)}rb`;
  return String(val);
}

export default function RevenueBarChart({ data }: { data: BarDatum[] }) {
  if (data.length === 0) {
    return (
      <p className="text-gray-400 text-sm text-center py-10">Belum ada data revenue.</p>
    );
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-3 h-48 w-full overflow-x-auto pt-6">
      {data.map((d) => (
        <div key={d.label} className="flex flex-col items-center gap-1.5 flex-1 min-w-[40px]">
          <span className="text-[0.65rem] text-gray-500">{formatShort(d.value)}</span>
          <div
            className="w-full rounded-t-md transition-all"
            style={{
              height: `${(d.value / max) * 100}%`,
              minHeight: d.value > 0 ? "4px" : "0",
              background: "linear-gradient(180deg, #0b2255 0%, #021d47 100%)",
            }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="text-[0.65rem] text-gray-500 whitespace-nowrap">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

**Checkpoint:** Chart compiles; scales bars to the max value; handles empty data.

---

## Task 10: Dashboard

**Files:**
- Create: `components/DashboardClient.tsx`
- Modify (replace contents): `app/admin/dashboard/page.tsx`

- [ ] **Step 1: Dashboard client component**

Create `components/DashboardClient.tsx`:
```tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { Transaction } from "@/lib/types";
import AdminSignOutButton from "@/components/AdminSignOutButton";
import RevenueBarChart, { BarDatum } from "@/components/RevenueBarChart";

function rupiah(val: number): string {
  return "Rp" + (val || 0).toLocaleString("id-ID");
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function DashboardClient({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const stats = useMemo(() => {
    const all = transactions.reduce((s, t) => s + (t.total || 0), 0);
    const month = transactions
      .filter((t) => t.created_at && monthKey(t.created_at) === thisMonthKey)
      .reduce((s, t) => s + (t.total || 0), 0);
    const online = transactions
      .filter((t) => t.channel === "online")
      .reduce((s, t) => s + (t.total || 0), 0);
    const direct = transactions
      .filter((t) => t.channel === "direct")
      .reduce((s, t) => s + (t.total || 0), 0);
    return { all, month, online, direct, count: transactions.length };
  }, [transactions, thisMonthKey]);

  const chartData: BarDatum[] = useMemo(() => {
    const byMonth = new Map<string, number>();
    for (const t of transactions) {
      if (!t.created_at) continue;
      const k = monthKey(t.created_at);
      byMonth.set(k, (byMonth.get(k) ?? 0) + (t.total || 0));
    }
    return Array.from(byMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([label, value]) => ({ label: label.slice(2), value }));
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        !search ||
        t.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        t.invoice_number?.toLowerCase().includes(search.toLowerCase());
      const created = t.created_at ? t.created_at.slice(0, 10) : "";
      const matchesFrom = !from || created >= from;
      const matchesTo = !to || created <= to;
      return matchesSearch && matchesFrom && matchesTo;
    });
  }, [transactions, search, from, to]);

  return (
    <div
      className="min-h-screen px-6 py-10"
      style={{ background: "#f0f4f8", fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
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
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/transactions/new"
              className="flex items-center gap-1.5 text-white text-sm font-semibold px-4 py-2 rounded-lg"
              style={{ background: "#021d47" }}
            >
              <Plus size={15} /> New Transaction
            </Link>
            <Link
              href="/admin/customers"
              className="text-sm font-semibold px-4 py-2 rounded-lg border"
              style={{ color: "#021d47", borderColor: "rgba(2,29,71,0.2)", background: "#fff" }}
            >
              Customers
            </Link>
            <Link
              href="/admin/wires"
              className="text-sm font-semibold px-4 py-2 rounded-lg border"
              style={{ color: "#021d47", borderColor: "rgba(2,29,71,0.2)", background: "#fff" }}
            >
              Wires
            </Link>
            <AdminSignOutButton />
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Revenue (Bulan Ini)", value: rupiah(stats.month) },
            { label: "Revenue (Total)", value: rupiah(stats.all) },
            { label: "Jumlah Transaksi", value: String(stats.count) },
            { label: "Online / Direct", value: `${rupiah(stats.online)} / ${rupiah(stats.direct)}` },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-2xl bg-white p-5 shadow-sm"
              style={{ border: "1px solid rgba(2,29,71,0.08)" }}
            >
              <p className="text-[0.7rem] uppercase tracking-wider text-gray-400">{c.label}</p>
              <p className="text-lg font-bold mt-1" style={{ color: "#021d47" }}>
                {c.value}
              </p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div
          className="rounded-2xl bg-white p-6 shadow-sm mb-8"
          style={{ border: "1px solid rgba(2,29,71,0.08)" }}
        >
          <p className="font-semibold text-[#021d47] text-sm mb-2">Revenue per Bulan</p>
          <RevenueBarChart data={chartData} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">Cari (nama / no. invoice)</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#021d47]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Dari</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#021d47]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sampai</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#021d47]"
            />
          </div>
        </div>

        {/* Transaction list */}
        <div
          className="rounded-2xl bg-white shadow-sm overflow-x-auto"
          style={{ border: "1px solid rgba(2,29,71,0.08)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#021d47", color: "#fff" }}>
                <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Tanggal</th>
                <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">No. Invoice</th>
                <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Customer</th>
                <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Kategori</th>
                <th className="text-right p-3 font-semibold text-xs uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400 italic">
                    Tidak ada transaksi.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/admin/transactions/${t.id}`)}
                    className="border-b border-gray-100 hover:bg-blue-50/50 cursor-pointer"
                  >
                    <td className="p-3 text-gray-600">
                      {t.created_at ? t.created_at.slice(0, 10) : t.invoice_date}
                    </td>
                    <td className="p-3 font-medium text-gray-800">{t.invoice_number}</td>
                    <td className="p-3 text-gray-700">{t.customer?.name}</td>
                    <td className="p-3 text-gray-600 capitalize">
                      {t.channel === "online" ? "Online Shop" : "Direct"}
                    </td>
                    <td className="p-3 text-right font-semibold" style={{ color: "#021d47" }}>
                      {rupiah(t.total)}
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

- [ ] **Step 2: Replace the dashboard page**

Replace the entire contents of `app/admin/dashboard/page.tsx` with:
```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listTransactions } from "@/lib/transactions";
import DashboardClient from "@/components/DashboardClient";

export const metadata = { title: "Dashboard — Ruslie Spring Admin" };

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin");

  const transactions = await listTransactions(supabase);
  return <DashboardClient transactions={transactions} />;
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

**Checkpoint:** Dashboard renders stats, chart, and a filterable list; rows link to the transaction.

---

## Task 11: Customers page

**Files:**
- Create: `components/CustomersClient.tsx`
- Create: `app/admin/customers/page.tsx`

- [ ] **Step 1: Customers CRUD client**

Create `components/CustomersClient.tsx`:
```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Save, X, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createCustomer, updateCustomer, deleteCustomer } from "@/lib/customers";
import type { Customer } from "@/lib/types";

const EMPTY: Customer = { name: "", address: "", city: "", phone: "" };

export default function CustomersClient({
  initialCustomers,
}: {
  initialCustomers: Customer[];
}) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [draft, setDraft] = useState<Customer>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setDraft(EMPTY);
    setEditingId(null);
    setError("");
  }

  async function handleSave() {
    setError("");
    if (!draft.name.trim()) {
      setError("Nama wajib diisi.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const payload = {
      name: draft.name,
      address: draft.address,
      city: draft.city,
      phone: draft.phone,
    };
    try {
      if (editingId) {
        const updated = await updateCustomer(supabase, editingId, payload);
        setCustomers((prev) => prev.map((c) => (c.id === editingId ? updated : c)));
      } else {
        const created = await createCustomer(supabase, payload);
        setCustomers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      resetForm();
    } catch {
      setError("Gagal menyimpan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus customer ini?")) return;
    const supabase = createClient();
    try {
      await deleteCustomer(supabase, id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      if (editingId === id) resetForm();
    } catch {
      setError("Gagal menghapus. Coba lagi.");
    }
  }

  function startEdit(c: Customer) {
    setEditingId(c.id ?? null);
    setDraft({ name: c.name, address: c.address, city: c.city, phone: c.phone });
    setError("");
  }

  return (
    <div
      className="min-h-screen px-6 py-10"
      style={{ background: "#f0f4f8", fontFamily: "'DM Sans', sans-serif" }}
    >
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
              Customers
            </h1>
          </div>
          <Link
            href="/admin/dashboard"
            className="text-sm font-semibold px-4 py-2 rounded-lg border"
            style={{ color: "#021d47", borderColor: "rgba(2,29,71,0.2)", background: "#fff" }}
          >
            ← Dashboard
          </Link>
        </div>

        {/* Add / edit form */}
        <div
          className="rounded-2xl bg-white p-5 shadow-sm mb-6"
          style={{ border: "1px solid rgba(2,29,71,0.08)" }}
        >
          <p className="font-semibold text-[#021d47] text-sm mb-3 flex items-center gap-2">
            {editingId ? <Pencil size={14} /> : <Plus size={14} />}
            {editingId ? "Edit Customer" : "Tambah Customer"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Nama"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#021d47]"
            />
            <input
              value={draft.phone}
              onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              placeholder="No. Telp"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#021d47]"
            />
            <input
              value={draft.address}
              onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
              placeholder="Alamat"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#021d47] sm:col-span-2"
            />
            <input
              value={draft.city}
              onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
              placeholder="Kota"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#021d47] sm:col-span-2"
            />
          </div>
          {error && <p className="text-red-500 text-xs mt-2">⚠ {error}</p>}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSave}
              disabled={busy}
              className="flex items-center gap-1.5 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-60"
              style={{ background: "#021d47" }}
            >
              <Save size={14} /> {busy ? "Menyimpan…" : "Simpan"}
            </button>
            {editingId && (
              <button
                onClick={resetForm}
                className="flex items-center gap-1.5 text-gray-500 text-sm font-medium px-4 py-2 rounded-lg border"
                style={{ borderColor: "rgba(2,29,71,0.12)" }}
              >
                <X size={14} /> Batal
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div
          className="rounded-2xl bg-white shadow-sm overflow-x-auto"
          style={{ border: "1px solid rgba(2,29,71,0.08)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#021d47", color: "#fff" }}>
                <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Nama</th>
                <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Kota</th>
                <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">No. Telp</th>
                <th className="p-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-gray-400 italic">
                    Belum ada customer.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100">
                    <td className="p-3 font-medium text-gray-800">{c.name}</td>
                    <td className="p-3 text-gray-600">{c.city}</td>
                    <td className="p-3 text-gray-600">{c.phone}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-3 justify-end">
                        <button
                          onClick={() => startEdit(c)}
                          className="text-gray-400 hover:text-[#021d47]"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => c.id && handleDelete(c.id)}
                          className="text-red-400 hover:text-red-600"
                          title="Hapus"
                        >
                          <Trash2 size={15} />
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

- [ ] **Step 2: Customers page**

Create `app/admin/customers/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listCustomers } from "@/lib/customers";
import CustomersClient from "@/components/CustomersClient";

export const metadata = { title: "Customers — Ruslie Spring Admin" };

export default async function AdminCustomersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin");

  const customers = await listCustomers(supabase);
  return <CustomersClient initialCustomers={customers} />;
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

**Checkpoint:** `/admin/customers` lists customers and supports add/edit/delete.

---

## Task 11b: Wires page (wires + editable types)

**Files:**
- Create: `components/WiresClient.tsx`
- Create: `app/admin/wires/page.tsx`

- [ ] **Step 1: Wires CRUD client**

Create `components/WiresClient.tsx`:
```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Save, X, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  createWire,
  updateWire,
  deleteWire,
  createWireType,
  updateWireType,
  deleteWireType,
} from "@/lib/wires";
import type { Wire, WireType } from "@/lib/types";

export default function WiresClient({
  initialWires,
  initialTypes,
}: {
  initialWires: Wire[];
  initialTypes: WireType[];
}) {
  const [wires, setWires] = useState<Wire[]>(initialWires);
  const [types, setTypes] = useState<WireType[]>(initialTypes);
  const [error, setError] = useState("");

  // wire draft
  const [wireName, setWireName] = useState("");
  const [wireTypeId, setWireTypeId] = useState<string>("");
  const [editingWireId, setEditingWireId] = useState<string | null>(null);

  // type draft
  const [typeName, setTypeName] = useState("");
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);

  const supabase = createClient();

  function typeNameOf(id?: string | null): string {
    return types.find((t) => t.type_id === id)?.name ?? "—";
  }

  /* ── Wire types ── */
  async function saveType() {
    setError("");
    if (!typeName.trim()) { setError("Nama tipe wajib diisi."); return; }
    try {
      if (editingTypeId) {
        const u = await updateWireType(supabase, editingTypeId, typeName.trim());
        setTypes((prev) => prev.map((t) => (t.type_id === editingTypeId ? u : t)));
      } else {
        const c = await createWireType(supabase, typeName.trim());
        setTypes((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setTypeName("");
      setEditingTypeId(null);
    } catch {
      setError("Gagal menyimpan tipe (mungkin nama duplikat).");
    }
  }

  async function removeType(id: string) {
    if (!confirm("Hapus tipe ini? Wire yang memakainya akan kehilangan tipe.")) return;
    try {
      await deleteWireType(supabase, id);
      setTypes((prev) => prev.filter((t) => t.type_id !== id));
    } catch {
      setError("Gagal menghapus tipe.");
    }
  }

  /* ── Wires ── */
  async function saveWire() {
    setError("");
    if (!wireName.trim()) { setError("Nama wire wajib diisi."); return; }
    const payload = { name: wireName.trim(), type_id: wireTypeId || null };
    try {
      if (editingWireId) {
        const u = await updateWire(supabase, editingWireId, payload);
        setWires((prev) => prev.map((w) => (w.wire_id === editingWireId ? u : w)));
      } else {
        const c = await createWire(supabase, payload);
        setWires((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setWireName("");
      setWireTypeId("");
      setEditingWireId(null);
    } catch {
      setError("Gagal menyimpan wire.");
    }
  }

  async function removeWire(id: string) {
    if (!confirm("Hapus wire ini?")) return;
    try {
      await deleteWire(supabase, id);
      setWires((prev) => prev.filter((w) => w.wire_id !== id));
    } catch {
      setError("Gagal menghapus wire.");
    }
  }

  function startEditWire(w: Wire) {
    setEditingWireId(w.wire_id ?? null);
    setWireName(w.name);
    setWireTypeId(w.type_id ?? "");
  }

  return (
    <div
      className="min-h-screen px-6 py-10"
      style={{ background: "#f0f4f8", fontFamily: "'DM Sans', sans-serif" }}
    >
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
              Wires
            </h1>
          </div>
          <Link
            href="/admin/dashboard"
            className="text-sm font-semibold px-4 py-2 rounded-lg border"
            style={{ color: "#021d47", borderColor: "rgba(2,29,71,0.2)", background: "#fff" }}
          >
            ← Dashboard
          </Link>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">⚠ {error}</p>}

        {/* Wire types */}
        <div
          className="rounded-2xl bg-white p-5 shadow-sm mb-6"
          style={{ border: "1px solid rgba(2,29,71,0.08)" }}
        >
          <p className="font-semibold text-[#021d47] text-sm mb-3">Tipe Wire</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {types.map((t) => (
              <span
                key={t.type_id}
                className="flex items-center gap-2 text-sm bg-blue-50 text-[#021d47] px-3 py-1.5 rounded-lg"
              >
                {t.name}
                <button onClick={() => { setEditingTypeId(t.type_id ?? null); setTypeName(t.name); }} title="Edit">
                  <Pencil size={13} className="text-gray-400 hover:text-[#021d47]" />
                </button>
                <button onClick={() => t.type_id && removeType(t.type_id)} title="Hapus">
                  <Trash2 size={13} className="text-red-400 hover:text-red-600" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              placeholder="Nama tipe (mis. SUS304)"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#021d47]"
            />
            <button
              onClick={saveType}
              className="flex items-center gap-1.5 text-white text-sm font-semibold px-4 py-2 rounded-lg"
              style={{ background: "#021d47" }}
            >
              <Save size={14} /> {editingTypeId ? "Update" : "Tambah"}
            </button>
            {editingTypeId && (
              <button
                onClick={() => { setEditingTypeId(null); setTypeName(""); }}
                className="flex items-center gap-1.5 text-gray-500 text-sm px-3 py-2 rounded-lg border"
                style={{ borderColor: "rgba(2,29,71,0.12)" }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Wire add/edit */}
        <div
          className="rounded-2xl bg-white p-5 shadow-sm mb-6"
          style={{ border: "1px solid rgba(2,29,71,0.08)" }}
        >
          <p className="font-semibold text-[#021d47] text-sm mb-3 flex items-center gap-2">
            {editingWireId ? <Pencil size={14} /> : <Plus size={14} />}
            {editingWireId ? "Edit Wire" : "Tambah Wire"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              value={wireName}
              onChange={(e) => setWireName(e.target.value)}
              placeholder="Nama wire"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#021d47]"
            />
            <select
              value={wireTypeId}
              onChange={(e) => setWireTypeId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#021d47]"
            >
              <option value="">— Tanpa tipe —</option>
              {types.map((t) => (
                <option key={t.type_id} value={t.type_id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={saveWire}
              className="flex items-center gap-1.5 text-white text-sm font-semibold px-5 py-2 rounded-lg"
              style={{ background: "#021d47" }}
            >
              <Save size={14} /> {editingWireId ? "Update" : "Simpan"}
            </button>
            {editingWireId && (
              <button
                onClick={() => { setEditingWireId(null); setWireName(""); setWireTypeId(""); }}
                className="flex items-center gap-1.5 text-gray-500 text-sm font-medium px-4 py-2 rounded-lg border"
                style={{ borderColor: "rgba(2,29,71,0.12)" }}
              >
                <X size={14} /> Batal
              </button>
            )}
          </div>
        </div>

        {/* Wire list */}
        <div
          className="rounded-2xl bg-white shadow-sm overflow-x-auto"
          style={{ border: "1px solid rgba(2,29,71,0.08)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#021d47", color: "#fff" }}>
                <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Nama</th>
                <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Tipe</th>
                <th className="p-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {wires.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-10 text-gray-400 italic">
                    Belum ada wire.
                  </td>
                </tr>
              ) : (
                wires.map((w) => (
                  <tr key={w.wire_id} className="border-b border-gray-100">
                    <td className="p-3 font-medium text-gray-800">{w.name}</td>
                    <td className="p-3 text-gray-600">{typeNameOf(w.type_id)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-3 justify-end">
                        <button onClick={() => startEditWire(w)} className="text-gray-400 hover:text-[#021d47]" title="Edit">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => w.wire_id && removeWire(w.wire_id)} className="text-red-400 hover:text-red-600" title="Hapus">
                          <Trash2 size={15} />
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

- [ ] **Step 2: Wires page**

Create `app/admin/wires/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listWires, listWireTypes } from "@/lib/wires";
import WiresClient from "@/components/WiresClient";

export const metadata = { title: "Wires — Ruslie Spring Admin" };

export default async function AdminWiresPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin");

  const [wires, types] = await Promise.all([
    listWires(supabase),
    listWireTypes(supabase),
  ]);
  return <WiresClient initialWires={wires} initialTypes={types} />;
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

**Checkpoint:** `/admin/wires` lists wires + types, supports add/edit/delete for both.

---

## Task 12: Retire the old invoice generator

**Files:**
- Delete: `app/invoice/page.tsx`
- Delete: `components/InvoiceClient.tsx`

- [ ] **Step 1: Delete the old route and component**

Run (PowerShell):
```powershell
Remove-Item app/invoice/page.tsx
Remove-Item components/InvoiceClient.tsx
Remove-Item app/invoice -Recurse -Force
```
(The navbar already has its `/invoice` links commented out — no navbar change needed. Verify nothing else imports `InvoiceClient`.)

- [ ] **Step 2: Confirm no dangling references**

Run: `npx tsc --noEmit`
Expected: no errors. If a "Cannot find module '@/components/InvoiceClient'" error appears, search for the importer and remove that import — but none is expected.

- [ ] **Step 3: Grep to be sure**

Run (PowerShell): `Select-String -Path .\**\*.tsx -Pattern "InvoiceClient","/invoice" -SimpleMatch`
Expected: matches only inside commented-out navbar lines (and none referencing a live import). If a live reference exists, remove it.

**Checkpoint:** `/invoice` no longer exists; the build type-checks clean.

---

## Task 13: Manual verification

**Files:** none (manual + dev server)

- [ ] **Step 1: Run the migration** (if not already): Supabase → SQL Editor → run `supabase/migrations/0001_transactions.sql`.

- [ ] **Step 2: Start dev server**

Run: `npm run dev`
Expected: server on `http://localhost:3000`, no errors.

- [ ] **Step 3:** Log in at `/admin`, land on `/admin/dashboard`. Expected: empty stats, empty chart message, "Tidak ada transaksi."

- [ ] **Step 4:** Go to Customers → add a customer (name + details) → it appears in the list. Edit it; delete a throwaway one.

- [ ] **Step 4b:** Go to Wires. Expected: the Tipe Wire section already shows **SUS304** and **BAJA** (seeded). Add a new type, rename it, delete it. Then add a wire (name + pick a type) → it appears in the wire list. Edit and delete work.

- [ ] **Step 5:** New Transaction → pick the saved customer from the dropdown. Expected: name/address/city/phone auto-fill and remain editable.

- [ ] **Step 6:** In Add Item, try clicking Add without picking a wire → expected error "Pilih wire terlebih dahulu". Pick a wire → the item name auto-fills (and is still editable); enter qty + price; Add. Add a second item. Choose channel = Online Shop, payment = cash. Click **Simpan Transaksi**. Expected: redirect to `/admin/transactions/<id>`, data intact, QR seal visible on the invoice with caption "Faktur sah dari Ruslie Spring".

- [ ] **Step 7:** Print Invoice (Ctrl+P preview) — QR + caption present, and the item table shows the item **name only** (no wire/type columns); Print Surat Jalan and Label A6 still work, unchanged, and do NOT show the QR.

- [ ] **Step 8:** Back to Dashboard. Expected: stat cards updated, the transaction listed with correct total + "Online Shop"; search by customer name and date filter both narrow the list; clicking the row reopens it.

- [ ] **Step 9:** On the transaction, change an item and click **Update**. Expected: stays the same record (same id/invoice number), values updated. Then delete is available via the dashboard flow (open record) — confirm the record can be removed if needed.

- [ ] **Step 10:** Visit `/admin/transactions/new` while logged out (incognito) → redirected to `/admin`. Visit `/invoice` → 404.

**Checkpoint:** All checks pass. Transactions, customers, dashboard, and QR seal all work end-to-end.

---

## Self-Review Notes

- **Spec coverage:** full invoice + save + print (Task 7), QR seal on invoice only (Tasks 5,7),
  channel online/direct (Tasks 1,2,7,10), no payment status (omitted by design), customers table
  + CRUD (Tasks 1,3,11), customer select auto-fill & editable (Tasks 6,7), dashboard list + stats
  + chart + channel breakdown + reprint/edit/delete (Tasks 9,10,7,8), RLS (Task 1), retire
  `/invoice` (Task 12), data helpers split by entity (Tasks 3,4,4b), shared types (Task 2),
  wire catalog tables seeded SUS304/BAJA (Task 1), wire + editable wire-type helpers (Task 4b),
  wire picker required on add-item with name auto-fill (Tasks 6b,7), `wire_id` on line items
  (Tasks 2,7), wires admin CRUD + editable types (Task 11b), print unchanged/name-only (Task 7
  leaves the document markup intact). All covered.
- **Delete safety:** Task 12 deletes only the old invoice route/component after the new form
  preserves its logic; a grep step guards against dangling references.
- **Git:** no commit steps anywhere, per user instruction.
- **Type consistency:** `Transaction`/`Customer`/`Channel` from `@/lib/types` used consistently;
  helper signatures `(supabase, …)` consistent across `lib/customers.ts` and `lib/transactions.ts`;
  `createClient` (browser) used in client components, server `createClient` in server pages.
- **Known minor:** `getFormattedInvoiceNumber`, `formatCurrency`, `todayFormatted` remain used in
  `TransactionForm`; `useRef`/`ChevronDown`/`Calculator`/`Home` no longer all used — Step 2 already
  prunes imports to the ones still referenced (`Home` is used in the new nav).
```

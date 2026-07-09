"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Plus, Trash2, Printer, Save, Cable, Link2, Check } from "lucide-react";
import AdminNav from "@/components/AdminNav";
import { createClient } from "@/lib/supabase/client";
import {
  createTransaction,
  updateTransaction,
  type ItemSuggestion,
} from "@/lib/transactions";
import { createCustomer } from "@/lib/customers";
import type { Customer, Channel, Transaction, Wire, WireType } from "@/lib/types";
import CustomerSelect from "@/components/CustomerSelect";
import WireSelect from "@/components/WireSelect";
import InvoiceQrSeal from "@/components/InvoiceQrSeal";

/* ─── Types ─────────────────────────────────────────────────────── */
interface InvoiceItem {
  uid?: string;
  wire_id?: string | null;
  name: string;
  qty: number;
  price: number;
}

type CustomerFields = { name: string; address: string; city: string; phone: string };

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

/* ─── Helpers ────────────────────────────────────────────────────── */
function formatCurrency(val: number): string {
  return val.toLocaleString("id-ID", { minimumFractionDigits: 0 });
}

function invoiceDatePart(): string {
  const date = new Date();
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return yy + mm + dd;
}

function randomLetters(): string {
  return Array.from({ length: 2 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join("");
}

// Indonesian company-form tokens that precede the actual business name.
const COMPANY_PREFIXES = new Set(["PT", "CV", "UD", "PD", "TB"]);

// Derive a 2-letter prefix from a customer name:
//   "KOBEX EQUIPMENT" -> "KE"   (initials of first two words)
//   "KOBEX"           -> "KO"   (first two letters of the only word)
//   "PT. KOBEX"       -> "KO"   (company form stripped first)
function getNamePrefix(name: string): string {
  const words = name
    .toUpperCase()
    .replace(/[^A-Z\s]/g, " ") // drop dots/punctuation so "PT." -> "PT"
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  while (words.length > 1 && COMPANY_PREFIXES.has(words[0])) words.shift();
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 2);
  return words[0][0] + words[1][0];
}

// Next 2-digit running sequence for a given date+suffix.
// Example: first "CS" today -> "01", a second one -> "02".
function nextSequence(
  datePart: string,
  suffix: string,
  existingNumbers: string[]
): string {
  // New format: INV-<yymmdd><nn>-<suffix>. Also count legacy
  // INV-<yymmdd>-<suffix> (no sequence) as occupying slot 01.
  const seqPattern = new RegExp(`^INV-${datePart}(\\d{2})-${suffix}$`);
  const legacy = `INV-${datePart}-${suffix}`;
  let max = 0;
  for (const num of existingNumbers) {
    const m = num.match(seqPattern);
    if (m) max = Math.max(max, parseInt(m[1], 10));
    else if (num === legacy) max = Math.max(max, 1);
  }
  return String(max + 1).padStart(2, "0");
}

function buildInvoiceNumber(name: string, existingNumbers: string[]): string {
  const suffix = getNamePrefix(name) || randomLetters();
  const datePart = invoiceDatePart();
  const seq = nextSequence(datePart, suffix, existingNumbers);
  return `INV-${datePart}${seq}-${suffix}`;
}

function todayFormatted(): string {
  return new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/* ─── Main component ─────────────────────────────────────────────── */
export default function TransactionForm({
  initialCustomers,
  initialWires,
  initialWireTypes,
  existing,
  existingInvoiceNumbers,
  itemSuggestions = [],
}: {
  initialCustomers: Customer[];
  initialWires: Wire[];
  initialWireTypes?: WireType[];
  existing?: Transaction;
  existingInvoiceNumbers?: string[];
  itemSuggestions?: ItemSuggestion[];
}) {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [wires] = useState<Wire[]>(initialWires);
  const [wireTypes] = useState<WireType[]>(initialWireTypes ?? []);
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
    items: (existing?.items ?? []).map((it) => ({ ...it, uid: crypto.randomUUID() })),
    shipping: existing?.shipping ?? 0,
    paymentMethod: existing?.payment_method ?? "cash",
    topNote: existing?.top_note ?? "",
  });

  const [newItem, setNewItem] = useState<InvoiceItem>({ wire_id: "", name: "", qty: 0, price: 0 });
  const [itemError, setItemError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [senderName, setSenderName] = useState(existing?.sender_name ?? "");
  const [linkCopied, setLinkCopied] = useState(false);

  async function handleCopyPublicLink() {
    if (!existing?.id) return;
    const url = `${window.location.origin}/invoice/${existing.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API unavailable (e.g. non-HTTPS) — fall back to a prompt.
      window.prompt("Salin link faktur publik:", url);
      return;
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  // Auto-generate an invoice number only when creating a new transaction.
  // The 2-letter suffix follows the customer name (falls back to random while blank).
  useEffect(() => {
    if (!existing) {
      setInvoice((p) => ({
        ...p,
        number: buildInvoiceNumber(p.customer.name, existingInvoiceNumbers ?? []),
      }));
    }
  }, [existing, invoice.customer.name, existingInvoiceNumbers]);

  /* ── Derived ── */
  const subtotal = invoice.items.reduce((acc, i) => acc + i.qty * i.price, 0);
  const total = subtotal + (invoice.shipping || 0);

  /* ── Mutations ── */
  function setCustomer(key: keyof CustomerFields, val: string) {
    setInvoice((p) => ({ ...p, customer: { ...p.customer, [key]: val } }));
  }

  function handleSelectWire(w: Wire | null) {
    setSelectedWireId(w?.wire_id ?? null);
    setNewItem((p) => ({ ...p, wire_id: w?.wire_id ?? "" }));
    setItemError("");
  }

  // Past items whose name contains what's typed (case-insensitive), capped so the
  // dropdown stays short. Empty query shows nothing.
  const matchedSuggestions = useMemo(() => {
    const q = newItem.name.trim().toLowerCase();
    if (!q) return [];
    return itemSuggestions
      .filter((s) => s.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [newItem.name, itemSuggestions]);

  function handleSelectSuggestion(s: ItemSuggestion) {
    // Only adopt the remembered wire if it still exists, so WireSelect never
    // shows a dangling id; name and price always fill.
    const wireStillExists = !!s.wire_id && wires.some((w) => w.wire_id === s.wire_id);
    setNewItem((p) => ({
      ...p,
      name: s.name,
      price: s.price,
      wire_id: wireStillExists ? s.wire_id : p.wire_id,
    }));
    if (wireStillExists) setSelectedWireId(s.wire_id);
    setShowSuggestions(false);
    setActiveSuggestion(0);
    setItemError("");
  }

  function addItem() {
    if (!newItem.wire_id) { setItemError("Pilih wire terlebih dahulu"); return; }
    if (!newItem.name.trim()) { setItemError("Item name is required"); return; }
    if (!newItem.qty || newItem.qty <= 0) { setItemError("Qty must be > 0"); return; }
    if (!newItem.price || newItem.price <= 0) { setItemError("Price must be > 0"); return; }
    setInvoice((p) => ({ ...p, items: [...p.items, { ...newItem, uid: crypto.randomUUID() }] }));
    setNewItem({ wire_id: "", name: "", qty: 0, price: 0 });
    setSelectedWireId(null);
    setItemError("");
  }

  function removeItem(uid: string) {
    setInvoice((p) => ({ ...p, items: p.items.filter((it) => it.uid !== uid) }));
  }

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
    } else {
      setInvoice((p) => ({
        ...p,
        customer: { name: "", address: "", city: "", phone: "" },
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
        items: invoice.items.map(({ uid, ...rest }) => rest),
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

  function handlePrintDeliveryOrder() {
    document.body.classList.add("printing-do");
    const cleanup = () => {
      document.body.classList.remove("printing-do");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    // Defer to next frame so the body class lands before the print dialog opens.
    requestAnimationFrame(() => window.print());
  }

  function handlePrintLabel() {
    document.body.classList.add("printing-label");
    const styleEl = document.createElement("style");
    styleEl.id = "label-page-style";
    styleEl.textContent = "@page { size: 105mm 100mm; margin: 5mm; }";
    document.head.appendChild(styleEl);
    const cleanup = () => {
      document.body.classList.remove("printing-label");
      document.getElementById("label-page-style")?.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    requestAnimationFrame(() => window.print());
  }


  return (
    <>
      {/* ── Print styles injected into <head> ───────────────────── */}
      <style>{`
        .doc-do { display: none; }
        .doc-label { display: none !important; }
        @media print {
          body.printing-label .doc-invoice,
          body.printing-label .doc-do { display: none !important; }
          body.printing-label .doc-label { display: flex !important; }
          body.printing-label .label-wrapper {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            max-width: none !important;
            width: 95mm !important;
            min-height: 90mm !important;
            background: #fff !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body.printing-label main { padding: 0 !important; margin: 0 !important; }
          body.printing-label .invoice-wrapper { display: none !important; }
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          main { padding: 0 !important; margin: 0 !important; }
          .no-print-bg { background: #fff !important; }
          .no-print { display: none !important; }
          .invoice-wrapper {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            margin: 0 auto !important;
            max-width: 100% !important;
            width: 100% !important;
            padding: 6mm 8mm !important;
            margin-top: 0 !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
          }
          .invoice-wrapper table { width: 100% !important; table-layout: auto; }
          .watermark-logo { max-width: 60% !important; max-height: 60% !important; height: auto !important; width: auto !important; }
          .print-input { border: none !important; background: transparent !important; padding: 0 !important; outline: none !important; box-shadow: none !important; }
          .payment-radio-label-unselected { display: none !important; }
          .top-input-print { border: none !important; background: transparent !important; }
          .action-col { display: none !important; }
          .add-item-section { display: none !important; }
          .print-btn-row { display: none !important; }
          nav.no-print-nav { display: none !important; }
          body.printing-do .doc-invoice { display: none !important; }
          body.printing-do .doc-do { display: block !important; }
        }
        @page { size: A4; margin: 14mm; }
      `}</style>

      {/* ── NAVBAR ──────────────────────────────────────────────── */}
      <AdminNav active="transaction" />

      {/* ── PAGE SHELL ───────────────────────────────────────────── */}
      <div
        className="admin-shell flex flex-col no-print-bg"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        {/* hero banner */}
        <header
          className="admin-content no-print pt-[68px] pb-8 px-6 relative z-10"
          style={{ background: "linear-gradient(135deg, #021d47 0%, #0b2255 100%)" }}
        >
          <div className="max-w-3xl mx-auto pt-8">
            <p className="text-white/40 text-[0.7rem] tracking-[0.2em] uppercase mb-2">Ruslie Spring Tools</p>
            <h1
              className="text-white text-[clamp(1.7rem,4vw,2.4rem)] font-bold"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {existing ? "Edit" : "New"} <span className="text-gray-300">Transaction</span>
            </h1>
            <p className="text-white/40 text-sm mt-1">Isi detail, simpan ke database, lalu cetak.</p>
          </div>
        </header>

        {/* ── INVOICE DOCUMENT ─────────────────────────────────── */}
        <main className="admin-content relative z-10 flex-1 px-4 sm:px-6 py-8 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="doc-invoice invoice-wrapper bg-white max-w-3xl mx-auto rounded-2xl shadow-2xl p-8 sm:p-10 relative overflow-hidden"
            style={{ border: "1px solid rgba(2,29,71,0.08)" }}
          >
            {/* Watermark */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0"
              aria-hidden
            >
              <img
                src="/Logo_Ruslie_Spring.png"
                alt=""
                className="watermark-logo block opacity-40"
                style={{ maxWidth: "60%", maxHeight: "60%", width: "auto", height: "auto" }}
              />
            </div>

            {/* ── HEADER ── */}
            <div className="relative z-10 flex justify-between items-start mb-10 flex-wrap gap-6">
              <div>
                <h2
                  className="text-[2.5rem] font-extrabold tracking-tight"
                  style={{ color: "#021d47", fontFamily: "var(--font-playfair)" }}
                >
                  INVOICE
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  <span className="font-semibold text-gray-800">Ruslie Spring</span><br />
                  Jl. Sikatan 45, Tandes, Surabaya<br />
                  +62 851 0481 5151
                </p>
              </div>
              <div className="flex items-start gap-4">
                <div className="text-right text-sm leading-7 text-gray-600">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-gray-400">Date:</span>
                    <input
                      value={invoice.date}
                      onChange={(e) => setInvoice((p) => ({ ...p, date: e.target.value }))}
                      placeholder="31 Mei 2026"
                      className="print-input border-b border-dashed border-gray-300 bg-transparent text-right text-sm text-gray-700 focus:outline-none focus:border-gray-500 w-40"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <span className="text-gray-400">Invoice No:</span>
                    <input
                      value={invoice.number}
                      onChange={(e) => setInvoice((p) => ({ ...p, number: e.target.value }))}
                      placeholder="INV-26053101-AB"
                      className="print-input border-b border-dashed border-gray-300 bg-transparent text-right text-sm font-semibold text-gray-700 focus:outline-none focus:border-gray-500 w-40"
                    />
                  </div>
                </div>
                <InvoiceQrSeal invoiceNumber={invoice.number} transactionId={existing?.id} />
              </div>
            </div>

            {/* ── BILL TO ── */}
            <div
              className="relative z-10 mb-8 rounded-xl p-5"
              style={{ background: "rgba(191,219,254,0.35)", border: "1px solid rgba(2,29,71,0.12)" }}
            >
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
                <input
                  value={invoice.customer.address}
                  onChange={(e) => setCustomer("address", e.target.value)}
                  placeholder="Address Line 1"
                  className="print-input col-span-2 border border-blue-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white/70 focus:outline-none focus:border-blue-400 transition-colors"
                />
                <input
                  value={invoice.customer.city}
                  onChange={(e) => setCustomer("city", e.target.value)}
                  placeholder="City, Zip Code"
                  className="print-input border border-blue-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white/70 focus:outline-none focus:border-blue-400 transition-colors"
                />
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm whitespace-nowrap">No Telp :</span>
                  <input
                    value={invoice.customer.phone}
                    onChange={(e) => setCustomer("phone", e.target.value)}
                    type="tel"
                    placeholder="Phone Number"
                    className="print-input flex-1 border border-blue-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white/70 focus:outline-none focus:border-blue-400 transition-colors"
                  />
                </div>
              </div>

              {/* Payment method */}
              <div className="mt-4 pt-4 border-t border-blue-200/60">
                <p className="font-semibold text-[#021d47] text-sm mb-2">Payment Method</p>
                <div className="flex items-center gap-5 text-sm">
                  <label
                    className={`flex items-center gap-1.5 cursor-pointer ${
                      invoice.paymentMethod !== "cash" ? "payment-radio-label-unselected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      value="cash"
                      checked={invoice.paymentMethod === "cash"}
                      onChange={() => setInvoice((p) => ({ ...p, paymentMethod: "cash" }))}
                      className="accent-[#021d47] no-print"
                    />
                    <span className={invoice.paymentMethod === "cash" ? "font-semibold text-[#021d47]" : "text-gray-500"}>
                      Cash
                    </span>
                  </label>
                  <label
                    className={`flex items-center gap-1.5 cursor-pointer ${
                      invoice.paymentMethod !== "top" ? "payment-radio-label-unselected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      value="top"
                      checked={invoice.paymentMethod === "top"}
                      onChange={() => setInvoice((p) => ({ ...p, paymentMethod: "top" }))}
                      className="accent-[#021d47] no-print"
                    />
                    <span className={invoice.paymentMethod === "top" ? "font-semibold text-[#021d47]" : "text-gray-500"}>
                      TOP
                    </span>
                  </label>
                </div>
                <AnimatePresence>
                  {invoice.paymentMethod === "top" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2"
                    >
                      <input
                        value={invoice.topNote}
                        onChange={(e) => setInvoice((p) => ({ ...p, topNote: e.target.value }))}
                        placeholder="Contoh: TOP 30 Hari"
                        className="top-input-print border border-blue-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white/70 focus:outline-none focus:border-blue-400 w-full sm:w-64"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

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
            </div>

            {/* ── ADD ITEM FORM (no-print) ── */}
            <div
              className="add-item-section no-print relative z-10 mb-6 rounded-xl p-5"
              style={{ background: "#f8fafc", border: "1.5px dashed rgba(2,29,71,0.14)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-[#021d47] text-sm flex items-center gap-2">
                  <Plus size={14} /> Add Item
                </p>
                <Link
                  href="/admin/wires"
                  className="text-[0.72rem] font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Cable size={12} /> Kelola Wire
                </Link>
              </div>

              {/* Wire picker — its own prominent labeled row */}
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Pilih Wire
                </label>
                <WireSelect
                  wires={wires}
                  types={wireTypes}
                  value={selectedWireId}
                  onSelect={handleSelectWire}
                />
                {wires.length === 0 && (
                  <p className="text-[0.72rem] text-gray-400 mt-1">
                    Belum ada wire di database.{" "}
                    <Link href="/admin/wires" className="text-blue-600 hover:underline">
                      Tambah wire dulu
                    </Link>
                    .
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="col-span-2 relative">
                  <input
                    value={newItem.name}
                    onChange={(e) => {
                      setNewItem((p) => ({ ...p, name: e.target.value }));
                      setItemError("");
                      setShowSuggestions(true);
                      setActiveSuggestion(0);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setShowSuggestions(false)}
                    placeholder="Nama item"
                    autoComplete="off"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-400 transition-colors"
                    onKeyDown={(e) => {
                      const open = showSuggestions && matchedSuggestions.length > 0;
                      if (open && e.key === "ArrowDown") {
                        e.preventDefault();
                        setActiveSuggestion((i) => Math.min(i + 1, matchedSuggestions.length - 1));
                      } else if (open && e.key === "ArrowUp") {
                        e.preventDefault();
                        setActiveSuggestion((i) => Math.max(i - 1, 0));
                      } else if (e.key === "Enter") {
                        if (open) {
                          e.preventDefault();
                          handleSelectSuggestion(matchedSuggestions[activeSuggestion]);
                        } else {
                          addItem();
                        }
                      } else if (e.key === "Escape") {
                        setShowSuggestions(false);
                      }
                    }}
                  />
                  {showSuggestions && matchedSuggestions.length > 0 && (
                    <ul className="absolute left-0 right-0 top-full mt-1 z-20 max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                      {matchedSuggestions.map((s, i) => {
                        const wireName = wires.find((w) => w.wire_id === s.wire_id)?.name;
                        return (
                          <li key={s.name}>
                            <button
                              type="button"
                              // Prevent the input's blur from firing before the click,
                              // which would close the dropdown and swallow the selection.
                              onMouseDown={(e) => e.preventDefault()}
                              onMouseEnter={() => setActiveSuggestion(i)}
                              onClick={() => handleSelectSuggestion(s)}
                              className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                                i === activeSuggestion ? "bg-blue-50 text-[#021d47]" : "text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              <span className="min-w-0">
                                <span className="block truncate">{s.name}</span>
                                {wireName && (
                                  <span className="block truncate text-xs text-gray-400">
                                    {wireName}
                                  </span>
                                )}
                              </span>
                              <span className="shrink-0 text-xs text-gray-400">
                                Rp{formatCurrency(s.price)}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <input
                  value={newItem.qty || ""}
                  onChange={(e) => setNewItem((p) => ({ ...p, qty: Number(e.target.value) }))}
                  type="number"
                  placeholder="Qty"
                  min={1}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-400 transition-colors"
                />
                <input
                  value={newItem.price || ""}
                  onChange={(e) => setNewItem((p) => ({ ...p, price: Number(e.target.value) }))}
                  type="number"
                  placeholder="Harga (Rp)"
                  min={1}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-400 transition-colors"
                  onKeyDown={(e) => e.key === "Enter" && addItem()}
                />
              </div>
              <AnimatePresence>
                {itemError && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-red-400 text-[0.75rem] mt-1.5"
                  >
                    ⚠ {itemError}
                  </motion.p>
                )}
              </AnimatePresence>
              <motion.button
                onClick={addItem}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="mt-3 flex items-center gap-1.5 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
                style={{ background: "#021d47", cursor: "pointer", fontFamily: "var(--font-dm-sans)", border: "none" }}
              >
                <Plus size={14} /> Add Item
              </motion.button>
            </div>

            {/* ── ITEMS TABLE ── */}
            <div className="relative z-10 mb-6 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr style={{ background: "#021d47", color: "#fff" }}>
                    {["#", "Item", "Qty", "Unit Price", "Total", ""].map((h, i) => (
                      <th
                        key={i}
                        className={`p-2.5 font-semibold text-xs tracking-wider uppercase border border-[#031a3d] ${
                          i === 0 ? "text-left w-8" :
                          i === 1 ? "text-left" :
                          i === 5 ? "w-12 action-col no-print" :
                          "text-right"
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {invoice.items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-300 text-sm italic">
                          No items yet — add one above
                        </td>
                      </tr>
                    ) : (
                      invoice.items.map((item, i) => (
                        <motion.tr
                          key={item.uid ?? i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.2 }}
                          className="hover:bg-blue-50/50 transition-colors"
                          style={{ borderBottom: "1px solid #e5e7eb" }}
                        >
                          <td className="border border-gray-200 p-2.5 text-gray-500">{i + 1}</td>
                          <td className="border border-gray-200 p-2.5 text-gray-800 font-medium">{item.name}</td>
                          <td className="border border-gray-200 p-2.5 text-right text-gray-700">{item.qty}</td>
                          <td className="border border-gray-200 p-2.5 text-right text-gray-700">
                            Rp{formatCurrency(item.price)}
                          </td>
                          <td className="border border-gray-200 p-2.5 text-right font-semibold text-[#021d47]">
                            Rp{formatCurrency(item.qty * item.price)}
                          </td>
                          <td className="border border-gray-200 p-2.5 text-center action-col no-print">
                            <button
                              onClick={() => removeItem(item.uid ?? "")}
                              className="text-red-400 hover:text-red-600 transition-colors"
                              title="Remove item"
                              style={{ background: "none", border: "none", cursor: "pointer" }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* ── SUMMARY ── */}
            <div className="relative z-10 text-right text-sm text-gray-700">
              <div className="inline-block min-w-[260px] text-left">
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium text-gray-800">Rp{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Shipping</span>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Rp</span>
                    <input
                      type="number"
                      min={0}
                      value={invoice.shipping || ""}
                      onChange={(e) => setInvoice((p) => ({ ...p, shipping: Number(e.target.value) }))}
                      placeholder="0"
                      className="print-input border-b border-dashed border-gray-300 bg-transparent text-right text-sm text-gray-700 w-24 focus:outline-none focus:border-gray-500 no-print"
                    />
                    <span className="hidden print:inline font-medium">{formatCurrency(invoice.shipping)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-3 pb-1">
                  <span
                    className="font-bold text-base"
                    style={{ color: "#021d47", fontFamily: "var(--font-playfair)" }}
                  >
                    TOTAL
                  </span>
                  <span
                    className="font-extrabold text-[1.25rem]"
                    style={{ color: "#021d47", fontFamily: "var(--font-playfair)" }}
                  >
                    Rp{formatCurrency(total)}
                  </span>
                </div>
              </div>
            </div>

            {/* ── FOOTER NOTE ── */}
            <div className="relative z-10 mt-12 pt-6 border-t border-gray-100 text-center text-xs text-gray-400 space-y-1">
              <p>Thank you for your business!</p>
              <p>
                Payment via BCA —{" "}
                <strong className="text-gray-600">8620134075</strong> —
                Albertus Marco Penolla Ruslie
              </p>
            </div>

            {/* ── DELIVERY ORDER — sender name (no-print) ── */}
            <div
              className="no-print relative z-10 mt-8 rounded-xl p-4"
              style={{ background: "#f8fafc", border: "1.5px dashed rgba(2,29,71,0.14)" }}
            >
              <label className="font-semibold text-[#021d47] text-sm block mb-2">
                Surat Jalan — Nama Pengirim
              </label>
              <input
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Contoh: Albertus Marco"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-400 transition-colors"
              />
              <p className="text-[0.7rem] text-gray-400 mt-1.5">
                Nama akan tercetak di bawah tanda tangan pada Surat Jalan.
              </p>
            </div>

            {/* ── PRINT BUTTON ── */}
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
                  fontFamily: "var(--font-dm-sans)",
                }}
              >
                {saving ? <span className="admin-btn-spinner" /> : <Save size={16} />}
                {saving ? "Menyimpan…" : existing ? "Update" : "Simpan Transaksi"}
              </motion.button>
              {existing?.id && (
                <motion.button
                  onClick={handleCopyPublicLink}
                  whileHover={{ scale: 1.04, boxShadow: "0 8px 28px rgba(2,29,71,0.18)" }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 font-semibold px-7 py-3 rounded-xl text-sm tracking-wide transition-colors"
                  style={{
                    background: linkCopied ? "#16a34a" : "#fff",
                    color: linkCopied ? "#fff" : "#021d47",
                    border: `1.5px solid ${linkCopied ? "#16a34a" : "#021d47"}`,
                    cursor: "pointer",
                    fontFamily: "var(--font-dm-sans)",
                  }}
                  title="Salin link faktur publik (dibuka dengan 4 digit terakhir no. HP)"
                >
                  {linkCopied ? <Check size={16} /> : <Link2 size={16} />}
                  {linkCopied ? "Link Tersalin" : "Salin Link Publik"}
                </motion.button>
              )}
              <motion.button
                onClick={() => window.print()}
                whileHover={{ scale: 1.04, boxShadow: "0 8px 28px rgba(2,29,71,0.22)" }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 text-white font-semibold px-7 py-3 rounded-xl text-sm tracking-wide"
                style={{
                  background: "linear-gradient(135deg, #021d47 0%, #0a2a5e 100%)",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-dm-sans)",
                }}
              >
                <Printer size={16} />
                Print Invoice
              </motion.button>
              <motion.button
                onClick={handlePrintDeliveryOrder}
                whileHover={{ scale: 1.04, boxShadow: "0 8px 28px rgba(2,29,71,0.22)" }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 font-semibold px-7 py-3 rounded-xl text-sm tracking-wide"
                style={{
                  background: "#fff",
                  color: "#021d47",
                  border: "1.5px solid #021d47",
                  cursor: "pointer",
                  fontFamily: "var(--font-dm-sans)",
                }}
              >
                <Printer size={16} />
                Print Surat Jalan
              </motion.button>
              <motion.button
                onClick={handlePrintLabel}
                whileHover={{ scale: 1.04, boxShadow: "0 8px 28px rgba(2,29,71,0.22)" }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 font-semibold px-7 py-3 rounded-xl text-sm tracking-wide"
                style={{
                  background: "#fff",
                  color: "#021d47",
                  border: "1.5px solid #021d47",
                  cursor: "pointer",
                  fontFamily: "var(--font-dm-sans)",
                }}
              >
                <Printer size={16} />
                Print Label A6
              </motion.button>
              <motion.button
                onClick={() => router.push("/admin/transactions/new")}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 text-gray-500 font-medium px-5 py-3 rounded-xl text-sm border transition-colors hover:text-gray-700"
                style={{
                  background: "#f8fafc",
                  border: "1.5px solid rgba(2,29,71,0.12)",
                  cursor: "pointer",
                  fontFamily: "var(--font-dm-sans)",
                }}
              >
                New Transaction
              </motion.button>
            </div>
          </motion.div>

          {/* ── DELIVERY ORDER DOCUMENT (hidden until printing-do) ─── */}
          <div
            className="doc-do invoice-wrapper bg-white max-w-3xl mx-auto rounded-2xl shadow-2xl p-8 sm:p-10 relative overflow-hidden"
            style={{ border: "1px solid rgba(2,29,71,0.08)" }}
          >
            {/* Watermark */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0"
              aria-hidden
            >
              <img
                src="/Logo_Ruslie_Spring.png"
                alt=""
                className="watermark-logo block opacity-40"
                style={{ maxWidth: "60%", maxHeight: "60%", width: "auto", height: "auto" }}
              />
            </div>

            {/* HEADER */}
            <div className="relative z-10 flex justify-between items-start mb-10 flex-wrap gap-6">
              <div>
                <h2
                  className="text-[2.3rem] font-extrabold tracking-tight leading-none"
                  style={{ color: "#021d47", fontFamily: "var(--font-playfair)" }}
                >
                  SURAT JALAN
                </h2>
                <p className="text-[0.7rem] uppercase tracking-[0.25em] text-gray-500 mt-1">
                  Delivery Order
                </p>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  <span className="font-semibold text-gray-800">Ruslie Spring</span><br />
                  Jl. Sikatan 45, Tandes, Surabaya<br />
                  +62 851 0481 5151
                </p>
              </div>
              <div className="text-right text-sm leading-7 text-gray-600">
                <div>
                  <span className="text-gray-400">Tanggal:</span>{" "}
                  <span className="text-gray-700">{invoice.date}</span>
                </div>
                <div>
                  <span className="text-gray-400">No. Ref:</span>{" "}
                  <span className="font-semibold text-gray-700">{invoice.number}</span>
                </div>
              </div>
            </div>

            {/* RECIPIENT */}
            <div
              className="relative z-10 mb-8 rounded-xl p-5"
              style={{ background: "rgba(191,219,254,0.35)", border: "1px solid rgba(2,29,71,0.12)" }}
            >
              <p className="font-semibold text-[#021d47] text-sm mb-3">Kepada Yth:</p>
              <p className="text-sm text-gray-800 font-medium">{invoice.customer.name}</p>
              <p className="text-sm text-gray-700">{invoice.customer.address}</p>
              <p className="text-sm text-gray-700">{invoice.customer.city}</p>
              <p className="text-sm text-gray-700">No Telp: {invoice.customer.phone}</p>
            </div>

            {/* ITEMS — qty only, no prices */}
            <div className="relative z-10 mb-12 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr style={{ background: "#021d47", color: "#fff" }}>
                    <th className="p-2.5 font-semibold text-xs tracking-wider uppercase border border-[#031a3d] text-left w-8">
                      #
                    </th>
                    <th className="p-2.5 font-semibold text-xs tracking-wider uppercase border border-[#031a3d] text-left">
                      Item
                    </th>
                    <th className="p-2.5 font-semibold text-xs tracking-wider uppercase border border-[#031a3d] text-right w-24">
                      Qty
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-8 text-gray-400 text-sm italic">
                        Belum ada item
                      </td>
                    </tr>
                  ) : (
                    invoice.items.map((item, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <td className="border border-gray-200 p-2.5 text-gray-500">{i + 1}</td>
                        <td className="border border-gray-200 p-2.5 text-gray-800 font-medium">
                          {item.name}
                        </td>
                        <td className="border border-gray-200 p-2.5 text-right text-gray-700">
                          {item.qty}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* SIGNATURE — Pengirim only */}
            <div className="relative z-10 flex justify-end mt-20 mb-4">
              <div className="text-center" style={{ minWidth: "220px" }}>
                <p className="text-sm text-gray-700 mb-20">Hormat Kami,</p>
                <div className="border-t border-gray-700 pt-2">
                  <p className="text-sm font-semibold text-gray-800">
                    {senderName || "( ............................. )"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Pengirim</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── A6 SHIPPING LABEL (hidden until printing-label) ─── */}
          <div
            className="doc-label label-wrapper"
            style={{
              position: "relative",
              width: "95mm",
              minHeight: "90mm",
              background: "#fff",
              color: "#000",
              fontFamily: "var(--font-dm-sans)",
              padding: "3mm 3mm",
              margin: "0 auto",
              boxSizing: "border-box",
              flexDirection: "column",
            }}
          >
            {/* Corner registration marks */}
            {[
              { top: 0, left: 0, borderTop: "0.35mm solid #000", borderLeft: "0.35mm solid #000" },
              { top: 0, right: 0, borderTop: "0.35mm solid #000", borderRight: "0.35mm solid #000" },
              { bottom: 0, left: 0, borderBottom: "0.35mm solid #000", borderLeft: "0.35mm solid #000" },
              { bottom: 0, right: 0, borderBottom: "0.35mm solid #000", borderRight: "0.35mm solid #000" },
            ].map((pos, i) => (
              <span
                key={i}
                aria-hidden
                style={{
                  position: "absolute",
                  width: "2.5mm",
                  height: "2.5mm",
                  ...pos,
                }}
              />
            ))}

            {/* ── HEADER ── */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "2mm",
                paddingBottom: "1mm",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "1.8mm" }}>
                <img
                  src="/Logo_Ruslie_Spring.png"
                  alt=""
                  style={{
                    height: "7mm",
                    width: "auto",
                    filter: "grayscale(1) contrast(1.2)",
                  }}
                />
                <div style={{ lineHeight: 1 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-playfair)",
                      fontWeight: 800,
                      fontStyle: "italic",
                      fontSize: "10.5pt",
                      letterSpacing: "-0.005em",
                    }}
                  >
                    Ruslie Spring
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "5pt",
                      letterSpacing: "0.3em",
                      textTransform: "uppercase",
                      marginTop: "0.4mm",
                    }}
                  >
                    Surabaya · Indonesia
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "5.5pt",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  textAlign: "right",
                  lineHeight: 1.3,
                  whiteSpace: "nowrap",
                }}
              >
                
                <div style={{ fontWeight: 600 }}></div>
              </div>
            </div>

            {/* Double rule under header */}
            <div style={{ borderTop: "0.25mm solid #000", marginTop: "0.4mm" }} />
            <div style={{ borderTop: "1mm solid #000", marginTop: "0.4mm" }} />

            {/* ── DARI ── */}
            <div style={{ paddingTop: "2mm", paddingBottom: "1.8mm" }}>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "5.5pt",
                  letterSpacing: "0.4em",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  marginBottom: "0.8mm",
                }}
              >
                D · A · R · I
              </div>
              <div
                style={{
                  fontFamily: "var(--font-dm-sans)",
                  fontSize: "8pt",
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  lineHeight: 1.3,
                }}
              >
                Jl. Sikatan 45, Tandes, Surabaya
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "7pt",
                  fontWeight: 500,
                  lineHeight: 1.3,
                  marginTop: "0.3mm",
                }}
              >
                +62 851 0481 5151
              </div>
            </div>

            {/* ── KEPADA · TO banner (black bar with white text) ── */}
            <div
              style={{
                padding: "1mm 2mm",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "2mm",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "6.5pt",
                  fontWeight: 600,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                }}
              >
                Kepada · To
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "6pt",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                }}
              >
                ↓
              </span>
            </div>

            {/* ── RECIPIENT (most prominent block on the label) ── */}
            <div style={{ paddingLeft: "1mm", paddingRight: "1mm" }}>
              <div
                style={{
                  fontFamily: "var(--font-dm-sans)",
                  fontSize: "13pt",
                  fontWeight: 900,
                  lineHeight: 1.05,
                  letterSpacing: "-0.005em",
                  textTransform: "uppercase",
                  color: "#000",
                  wordBreak: "break-word",
                  marginBottom: "1.5mm",
                }}
              >
                {invoice.customer.name || "—"}
              </div>

              <div
                style={{
                  fontFamily: "var(--font-dm-sans)",
                  fontSize: "8.5pt",
                  fontWeight: 400,
                  lineHeight: 1.3,
                }}
              >
                {invoice.customer.address}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-dm-sans)",
                  fontSize: "8.5pt",
                  fontWeight: 500,
                  lineHeight: 1.3,
                  marginTop: "0.3mm",
                }}
              >
                {invoice.customer.city}
              </div>

              {/* TELP row with mono number, hairline rule above */}
              <div
                style={{
                  marginTop: "1.5mm",
                  paddingTop: "1mm",
                  borderTop: "0.2mm solid #000",
                  display: "flex",
                  alignItems: "baseline",
                  gap: "2mm",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "5.5pt",
                    letterSpacing: "0.4em",
                    fontWeight: 600,
                    textTransform: "uppercase",
                  }}
                >
                  Telp
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "8.5pt",
                    fontWeight: 500,
                    letterSpacing: "0.04em",
                  }}
                >
                  {invoice.customer.phone || "—"}
                </span>
              </div>
            </div>

            {/* ── FOOTER · ISI BARANG ── */}
            <div style={{ marginTop: "auto", paddingTop: "2mm" }}>
              <div style={{ borderTop: "0.25mm solid #000" }} />
              <div style={{ borderTop: "0.7mm solid #000", marginTop: "0.4mm" }} />

              {/* ISI header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  paddingTop: "1.2mm",
                  paddingBottom: "0.8mm",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "5.5pt",
                    letterSpacing: "0.4em",
                    fontWeight: 600,
                    textTransform: "uppercase",
                  }}
                >
                  Isi · 
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "5.5pt",
                    letterSpacing: "0.2em",
                    fontWeight: 500,
                    textTransform: "uppercase",
                  }}
                >
                  {invoice.date} · {invoice.items.length} item
                  {invoice.items.length === 1 ? "" : "s"}
                </span>
              </div>

              {/* Itemized list */}
              <div style={{ borderTop: "0.2mm solid #000" }}>
                {invoice.items.length === 0 ? (
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "6.5pt",
                      padding: "1mm 0",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                    }}
                  >
                    —
                  </div>
                ) : (
                  invoice.items.map((it, i) => (
                    <div
                      key={i}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "5mm 9mm 1fr",
                        columnGap: "1.5mm",
                        alignItems: "baseline",
                        padding: "0.5mm 0",
                        borderBottom:
                          i === invoice.items.length - 1
                            ? "none"
                            : "0.15mm solid #000",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "6pt",
                          fontWeight: 500,
                          letterSpacing: "0.05em",
                        }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "7.5pt",
                          fontWeight: 600,
                          letterSpacing: "0.02em",
                        }}
                      >
                        ×{it.qty}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-dm-sans)",
                          fontSize: "7.5pt",
                          fontWeight: 500,
                          lineHeight: 1.2,
                          wordBreak: "break-word",
                        }}
                      >
                        {it.name}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>

        {/* ── PAGE FOOTER ─────────────────────────────────────────── */}
        <footer
          className="admin-content relative z-10 no-print text-white text-center py-5 text-[0.78rem]"
          style={{ background: "#021d47" }}
        >
          <p className="text-white/45">
            © {new Date().getFullYear()}{" "}
            <span
              className="text-white/75"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Ruslie Spring
            </span>
            . All rights reserved.
          </p>
        </footer>

        {/* WhatsApp FAB */}
        <motion.a
          href="https://wa.me/6285104815151"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
          whileHover={{ scale: 1.1, boxShadow: "0 8px 30px rgba(34,197,94,0.45)" }}
          whileTap={{ scale: 0.95 }}
          className="no-print fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full text-white shadow-xl"
          style={{ background: "#22c55e" }}
          title="Chat via WhatsApp"
        >
          💬
        </motion.a>
      </div>
    </>
  );
}

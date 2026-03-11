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

/* ─── Types ─────────────────────────────────────────────────────── */
interface InvoiceItem {
  name: string;
  qty: number;
  price: number;
}

interface Customer {
  name: string;
  address: string;
  city: string;
  phone: string;
}

interface InvoiceState {
  date: string;
  number: string;
  customer: Customer;
  items: InvoiceItem[];
  shipping: number;
  paymentMethod: "cash" | "top";
  topNote: string;
}

/* ─── Helpers ────────────────────────────────────────────────────── */
function formatCurrency(val: number): string {
  return val.toLocaleString("id-ID", { minimumFractionDigits: 0 });
}

function getFormattedInvoiceNumber(): string {
  const date = new Date();
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const datePart = yy + mm + dd;
  const letters = Array.from({ length: 2 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join("");
  return `${datePart}-${letters}`;
}

function todayFormatted(): string {
  return new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/* ─── Main component ─────────────────────────────────────────────── */
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

  // fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  // set invoice number on mount
  useEffect(() => {
    setInvoice((p) => ({ ...p, number: "INV-" + getFormattedInvoiceNumber() }));
  }, []);

  /* ── Derived ── */
  const subtotal = invoice.items.reduce((acc, i) => acc + i.qty * i.price, 0);
  const total = subtotal + (invoice.shipping || 0);

  /* ── Mutations ── */
  function setCustomer(key: keyof Customer, val: string) {
    setInvoice((p) => ({ ...p, customer: { ...p.customer, [key]: val } }));
  }

  function addItem() {
    if (!newItem.name.trim()) { setItemError("Item name is required"); return; }
    if (!newItem.qty || newItem.qty <= 0) { setItemError("Qty must be > 0"); return; }
    if (!newItem.price || newItem.price <= 0) { setItemError("Price must be > 0"); return; }
    setInvoice((p) => ({ ...p, items: [...p.items, { ...newItem }] }));
    setNewItem({ name: "", qty: 0, price: 0 });
    setItemError("");
  }

  function removeItem(i: number) {
    setInvoice((p) => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
  }

  return (
    <>
      {/* ── Print styles injected into <head> ───────────────────── */}
      <style>{`
        @media print {
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .invoice-wrapper { box-shadow: none !important; border-radius: 0 !important; margin: 0 !important; max-width: 100% !important; padding: 28px !important; }
          .print-input { border: none !important; background: transparent !important; padding: 0 !important; outline: none !important; box-shadow: none !important; }
          .payment-radio-label-unselected { display: none !important; }
          .top-input-print { border: none !important; background: transparent !important; }
          .action-col { display: none !important; }
          .add-item-section { display: none !important; }
          .print-btn-row { display: none !important; }
          nav.no-print-nav { display: none !important; }
        }
        @page { size: A4; margin: 18mm; }
      `}</style>

      {/* ── NAVBAR ──────────────────────────────────────────────── */}
      <nav
        className="no-print fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-10 h-[68px]"
        style={{
          background: "rgba(2,29,71,0.97)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-base"
            style={{ background: "#fff", color: "#021d47", fontFamily: "'Playfair Display', serif" }}
          >
            R
          </div>
          <span
            className="text-white font-bold text-[1.15rem] tracking-wide"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            
          </span>
        </Link>

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
      </nav>

      {/* ── PAGE SHELL ───────────────────────────────────────────── */}
      <div
        className="min-h-screen flex flex-col no-print-bg"
        style={{ background: "#f0f4f8", fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* hero banner */}
        <header
          className="no-print pt-[68px] pb-8 px-6"
          style={{ background: "linear-gradient(135deg, #021d47 0%, #0b2255 100%)" }}
        >
          <div className="max-w-3xl mx-auto pt-8">
            <p className="text-white/40 text-[0.7rem] tracking-[0.2em] uppercase mb-2">Ruslie Spring Tools</p>
            <h1
              className="text-white text-[clamp(1.7rem,4vw,2.4rem)] font-bold"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Invoice <span className="text-gray-300">Generator</span>
            </h1>
            <p className="text-white/40 text-sm mt-1">Fill in the details below, then print or save as PDF.</p>
          </div>
        </header>

        {/* ── INVOICE DOCUMENT ─────────────────────────────────── */}
        <main className="flex-1 px-4 sm:px-6 py-8 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="invoice-wrapper bg-white max-w-3xl mx-auto rounded-2xl shadow-2xl p-8 sm:p-10 relative overflow-hidden"
            style={{ border: "1px solid rgba(2,29,71,0.08)" }}
          >
            {/* Watermark */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0"
              aria-hidden
            >
              {/* text-based watermark — works without image file */}
              <span
                className="text-[#021d47] font-extrabold text-[5rem] opacity-[0.4] tracking-widest whitespace-nowrap"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                <img src="/Logo_Ruslie_Spring.png" alt="" />
              </span>
            </div>

            {/* ── HEADER ── */}
            <div className="relative z-10 flex justify-between items-start mb-10 flex-wrap gap-6">
              <div>
                <h2
                  className="text-[2.5rem] font-extrabold tracking-tight"
                  style={{ color: "#021d47", fontFamily: "'Playfair Display', serif" }}
                >
                  INVOICE
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  <span className="font-semibold text-gray-800">Ruslie Spring</span><br />
                  Jl. Sikatan 45, Tandes, Surabaya<br />
                  +62 851 0481 5151
                </p>
              </div>
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
            </div>

            {/* ── BILL TO ── */}
            <div
              className="relative z-10 mb-8 rounded-xl p-5"
              style={{ background: "rgba(191,219,254,0.35)", border: "1px solid rgba(2,29,71,0.12)" }}
            >
              <p className="font-semibold text-[#021d47] text-sm mb-3">Bill To:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
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
            </div>

            {/* ── ADD ITEM FORM (no-print) ── */}
            <div
              className="add-item-section no-print relative z-10 mb-6 rounded-xl p-5"
              style={{ background: "#f8fafc", border: "1.5px dashed rgba(2,29,71,0.14)" }}
            >
              <p className="font-semibold text-[#021d47] text-sm mb-3 flex items-center gap-2">
                <Plus size={14} /> Add Item
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <input
                  value={newItem.name}
                  onChange={(e) => { setNewItem((p) => ({ ...p, name: e.target.value })); setItemError(""); }}
                  placeholder="Item name"
                  className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-400 transition-colors"
                  onKeyDown={(e) => e.key === "Enter" && addItem()}
                />
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
                  placeholder="Price (Rp)"
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
                style={{ background: "#021d47", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", border: "none" }}
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
                          key={i}
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
                              onClick={() => removeItem(i)}
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
                    style={{ color: "#021d47", fontFamily: "'Playfair Display', serif" }}
                  >
                    TOTAL
                  </span>
                  <span
                    className="font-extrabold text-[1.25rem]"
                    style={{ color: "#021d47", fontFamily: "'Playfair Display', serif" }}
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

            {/* ── PRINT BUTTON ── */}
            <div className="print-btn-row no-print relative z-10 mt-8 flex justify-center gap-3">
              <motion.button
                onClick={() => window.print()}
                whileHover={{ scale: 1.04, boxShadow: "0 8px 28px rgba(2,29,71,0.22)" }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 text-white font-semibold px-7 py-3 rounded-xl text-sm tracking-wide"
                style={{
                  background: "linear-gradient(135deg, #021d47 0%, #0a2a5e 100%)",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <Printer size={16} />
                Print / Save as PDF
              </motion.button>
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
            </div>
          </motion.div>
        </main>

        {/* ── PAGE FOOTER ─────────────────────────────────────────── */}
        <footer
          className="no-print text-white text-center py-5 text-[0.78rem]"
          style={{ background: "#021d47" }}
        >
          <p className="text-white/45">
            © {new Date().getFullYear()}{" "}
            <span
              className="text-white/75"
              style={{ fontFamily: "'Playfair Display', serif" }}
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

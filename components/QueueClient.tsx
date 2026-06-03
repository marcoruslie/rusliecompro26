"use client";

import { useState, useRef, useEffect, Fragment } from "react";
import { useSearchParams } from "next/navigation";
import {
  Upload,
  Eye,
  Trash2,
  CheckCircle2,
  RotateCcw,
  FileText,
  Link2,
  ClipboardPaste,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateOrderStatus } from "@/lib/orders";
import type { Transaction, OrderStatus } from "@/lib/types";
import type { AppRole } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";

function formatRupiah(n: number) {
  return "Rp " + (n ?? 0).toLocaleString("id-ID");
}

// Pull a PDF out of a paste/drop's DataTransfer. iOS exposes the file through
// `items` (kind "file") rather than `files`, so check both.
function pdfFromDataTransfer(dt: DataTransfer | null | undefined): File | null {
  if (!dt) return null;
  const isPdf = (f: File) =>
    f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
  const fromFiles = Array.from(dt.files ?? []).find(isPdf);
  if (fromFiles) return fromFiles;
  for (const item of Array.from(dt.items ?? [])) {
    if (item.kind === "file" && (item.type === "application/pdf" || item.type === "")) {
      const f = item.getAsFile();
      if (f && isPdf(f)) return f;
    }
  }
  return null;
}

export default function QueueClient({
  initialOrders,
  connected,
  role = "admin",
}: {
  initialOrders: Transaction[];
  connected: boolean;
  role?: AppRole;
}) {
  const params = useSearchParams();
  const [orders, setOrders] = useState<Transaction[]>(initialOrders);
  const [tab, setTab] = useState<OrderStatus>("processing");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const justConnected = params.get("connected") === "1";
  const oauthError = params.get("error");

  // The Queue never shows monetary values for anyone — admin or viewer alike.
  // (For viewers, amounts are also stripped server-side as defense in depth.)
  const showAmounts = false;
  const colCount = showAmounts ? 6 : 5;

  // Viewers may open/preview PDFs but not upload, paste, or delete them.
  // (The image API also rejects viewer POST/DELETE as defense in depth.)
  const canManagePdf = role !== "viewer";

  const visible = orders.filter((o) => (o.status ?? "processing") === tab);
  const selectedOrder = orders.find((o) => o.id === selectedId) ?? null;
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
      setError("Gagal mengunggah PDF.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemoveImage(o: Transaction) {
    if (!o.id || !confirm("Hapus PDF order ini?")) return;
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
      setError("Gagal menghapus PDF.");
    } finally {
      setBusyId(null);
    }
  }

  // Per-row paste: read a PDF from the clipboard and upload it straight to this
  // order, no row-selection needed. Where the clipboard has no PDF (Safari),
  // the upload icon beside it stays as the reliable file-picker fallback.
  async function pasteForOrder(o: Transaction) {
    if (!canManagePdf || !connected || !o.id) return;
    setError("");
    try {
      if (!navigator.clipboard?.read) throw new Error("unsupported");
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t === "application/pdf");
        if (!type) continue;
        const blob = await item.getType(type);
        const file = new File([blob], "clipboard.pdf", { type: "application/pdf" });
        handleUpload(o, file);
        return;
      }
      setError("Tidak ada PDF di clipboard — pakai ikon unggah untuk memilih file.");
    } catch {
      setError("Tidak ada PDF di clipboard — pakai ikon unggah untuk memilih file.");
    }
  }

  // Paste a PDF straight from the clipboard onto the selected order. Copy a PDF
  // file in the OS file manager (Ctrl+C), click a row to select it, then Ctrl+V.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (!canManagePdf || !selectedId || !connected) return;
      const pdf = pdfFromDataTransfer(e.clipboardData);
      if (!pdf) return;
      const order = orders.find((o) => o.id === selectedId);
      if (!order) return;
      e.preventDefault();
      handleUpload(order, pdf);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, connected, orders]);

  return (
    <div className="admin-shell px-6 pb-10 pt-[92px]">
      <AdminNav active="queue" role={role} />
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
                Sambungkan akun Google untuk mengunggah & melihat PDF order.
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

        {/* Clipboard paste hint (editors only) */}
        {canManagePdf && (
          <div className="mb-4">
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <ClipboardPaste size={15} className="shrink-0" />
              {!connected ? (
                "Hubungkan Google Drive untuk mengunggah PDF."
              ) : selectedOrder ? (
                <>
                  Order{" "}
                  <span className="font-semibold text-[#021d47]">
                    {selectedOrder.invoice_number}
                  </span>{" "}
                  dipilih — tempel (Ctrl+V) file PDF dari clipboard untuk mengunggah.
                </>
              ) : (
                "Klik satu order untuk memilih, lalu tempel (Ctrl+V) file PDF dari clipboard."
              )}
            </p>
            {/* Phones have no Ctrl+V. iOS won't expose a copied PDF to the async
                Clipboard API, but a real paste event into an editable box does.
                Select an order, tap this box, then tap the native Paste. */}
            {connected && (
              <div
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-label="Tempel PDF di sini"
                data-placeholder={
                  selectedOrder
                    ? `Ketuk di sini lalu Tempel PDF untuk ${selectedOrder.invoice_number}`
                    : "Pilih satu order dulu, lalu ketuk & Tempel PDF di sini"
                }
                onPaste={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.textContent = "";
                  if (!selectedOrder) {
                    setError("Pilih satu order dulu sebelum menempel PDF.");
                    return;
                  }
                  const pdf = pdfFromDataTransfer(e.clipboardData);
                  if (pdf) {
                    setError("");
                    handleUpload(selectedOrder, pdf);
                  } else {
                    setError(
                      "Clipboard tidak berisi file PDF — di iOS, salin PDF dari app lain lalu coba lagi, atau pakai ikon unggah."
                    );
                  }
                }}
                className="paste-box mt-3 sm:hidden"
              />
            )}
          </div>
        )}

        {/* Table */}
        <div className="admin-panel admin-rise rounded-2xl overflow-x-auto">
          <table className="admin-table queue-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                {showAmounts && <th>Total</th>}
                <th>Tanggal</th>
                <th>PDF</th>
                <th className="w-56"></th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="!text-center py-10 text-gray-400 italic">
                    Tidak ada order {tab === "processing" ? "diproses" : "selesai"}.
                  </td>
                </tr>
              ) : (
                visible.map((o) => (
                  <Fragment key={o.id}>
                  <tr
                    onClick={canManagePdf ? () => setSelectedId(o.id ?? null) : undefined}
                    className={canManagePdf ? "queue-row cursor-pointer" : "queue-row"}
                    style={
                      canManagePdf && selectedId === o.id
                        ? { background: "rgba(2,29,71,0.05)", boxShadow: "inset 3px 0 0 #021d47" }
                        : undefined
                    }
                  >
                    <td className="font-semibold text-[#021d47]">{o.invoice_number}</td>
                    <td className="text-gray-700">{o.customer?.name}</td>
                    {showAmounts && <td className="text-gray-700">{formatRupiah(o.total)}</td>}
                    <td className="text-gray-500">{o.invoice_date}</td>
                    <td>
                      {o.image_drive_id ? (
                        <span className="inline-flex items-center gap-1.5 text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full text-xs font-medium">
                          <FileText size={13} /> Ada
                        </span>
                      ) : (
                        <span className="text-gray-300 text-sm">—</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-3 justify-end">
                        {/* Upload (editors only) */}
                        {canManagePdf && (
                          <>
                            <input
                              ref={(el) => {
                                if (o.id) fileInputs.current[o.id] = el;
                              }}
                              type="file"
                              accept="application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUpload(o, f);
                                e.target.value = "";
                              }}
                            />
                            <button
                              onClick={() => pasteForOrder(o)}
                              disabled={!connected || busyId === o.id}
                              className="text-gray-400 hover:text-[#021d47] transition-colors disabled:opacity-40"
                              title={connected ? "Tempel PDF dari clipboard" : "Hubungkan Google dulu"}
                            >
                              <ClipboardPaste size={17} />
                            </button>
                            <button
                              onClick={() => o.id && fileInputs.current[o.id]?.click()}
                              disabled={!connected || busyId === o.id}
                              className="text-gray-400 hover:text-[#021d47] transition-colors disabled:opacity-40"
                              title={connected ? "Upload PDF" : "Hubungkan Google dulu"}
                            >
                              {busyId === o.id ? (
                                <span className="admin-spinner-xs" />
                              ) : (
                                <Upload size={17} />
                              )}
                            </button>
                          </>
                        )}
                        {/* View PDF in a new tab */}
                        <a
                          href={o.image_drive_id ? `/api/orders/${o.id}/image` : undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={
                            o.image_drive_id
                              ? "admin-btn-ghost !py-1 text-sm whitespace-nowrap"
                              : "admin-btn-ghost !py-1 text-sm whitespace-nowrap opacity-40 pointer-events-none"
                          }
                          title="Lihat PDF"
                        >
                          <Eye size={16} /> Lihat PDF
                        </a>
                        {/* Remove image (editors only) */}
                        {o.image_drive_id && canManagePdf && (
                          <button
                            onClick={() => handleRemoveImage(o)}
                            disabled={busyId === o.id}
                            className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-60"
                            title="Hapus PDF"
                          >
                            <Trash2 size={17} />
                          </button>
                        )}
                        {/* Status toggle */}
                        <button
                          onClick={() => toggleStatus(o)}
                          disabled={busyId === o.id}
                          className="admin-btn-ghost !py-1.5 !px-3 text-sm"
                          title={o.status === "completed" ? "Kembalikan ke proses" : "Tandai selesai"}
                        >
                          {o.status === "completed" ? (
                            <>
                              <RotateCcw size={15} /> Proses
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={15} /> Selesai
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Item details */}
                  <tr
                    onClick={canManagePdf ? () => setSelectedId(o.id ?? null) : undefined}
                    className={canManagePdf ? "queue-detail cursor-pointer" : "queue-detail"}
                    style={
                      canManagePdf && selectedId === o.id
                        ? { background: "rgba(2,29,71,0.05)", boxShadow: "inset 3px 0 0 #021d47" }
                        : undefined
                    }
                  >
                    <td colSpan={colCount}>
                      <div className="rounded-xl border border-slate-100 bg-slate-50/60 divide-y divide-slate-100">
                        {o.items && o.items.length > 0 ? (
                          o.items.map((it, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
                            >
                              <span className="flex items-center gap-3 text-gray-700">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-500 shrink-0">
                                  {i + 1}
                                </span>
                                {it.name}
                              </span>
                              <span className="text-gray-500 whitespace-nowrap">
                                {showAmounts ? (
                                  <>
                                    {it.qty} × {formatRupiah(it.price)} ={" "}
                                    <span className="font-semibold text-[#021d47]">
                                      {formatRupiah(it.qty * it.price)}
                                    </span>
                                  </>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className="text-gray-400">Qty</span>
                                    <span className="font-semibold text-[#021d47]">{it.qty}</span>
                                  </span>
                                )}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-2.5 text-sm text-gray-400 italic">
                            Tidak ada item.
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, Fragment } from "react";
import { useSearchParams } from "next/navigation";
import {
  Eye,
  Trash2,
  CheckCircle2,
  RotateCcw,
  FileText,
  Link2,
  Unlink,
  ClipboardPaste,
  Printer,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateOrderStatus } from "@/lib/orders";
import type { Transaction, OrderStatus } from "@/lib/types";
import type { AppRole } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";

function formatRupiah(n: number) {
  return "Rp " + (n ?? 0).toLocaleString("id-ID");
}

// Pull a PDF or image out of a paste/drop's DataTransfer. iOS won't expose a
// copied PDF to the web at all, but it *does* expose images — so accepting
// images is what makes paste work on iPhone. iOS uses `items` (kind "file")
// rather than `files`, so check both.
function attachmentFromDataTransfer(dt: DataTransfer | null | undefined): File | null {
  if (!dt) return null;
  const ok = (f: File) =>
    f.type === "application/pdf" ||
    f.type.startsWith("image/") ||
    /\.(pdf|png|jpe?g|gif|webp|heic|heif|bmp)$/i.test(f.name);
  const fromFiles = Array.from(dt.files ?? []).find(ok);
  if (fromFiles) return fromFiles;
  for (const item of Array.from(dt.items ?? [])) {
    if (item.kind === "file") {
      const f = item.getAsFile();
      if (f && ok(f)) return f;
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
  // Mirror the server-provided `connected` so disconnecting flips the UI
  // immediately (revealing the Connect banner) without a full page reload.
  const [conn, setConn] = useState(connected);
  const [orders, setOrders] = useState<Transaction[]>(initialOrders);
  const [tab, setTab] = useState<OrderStatus>("processing");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Paste failures are shown inline next to the button that failed, keyed by
  // order id, rather than in the page-level error banner.
  const [pasteErr, setPasteErr] = useState<Record<string, string>>({});
  // Printing is built on demand: preload every file, render the off-screen grid,
  // then call window.print() — so we don't eagerly fetch all files on page load.
  const [printing, setPrinting] = useState(false);

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

  // Print: files from the current tab, packed 6 per A4 page (2×3 grid).
  // The last page is padded with blank cells so the 6-up layout stays intact.
  const printable = visible.filter((o) => o.image_drive_id);
  const printPages: (Transaction | null)[][] = [];
  for (let i = 0; i < printable.length; i += 6) {
    const slice = printable.slice(i, i + 6);
    while (slice.length < 6) slice.push(null as unknown as Transaction);
    printPages.push(slice);
  }

  // Mount the off-screen grid, preload every file (so cached images don't stall
  // a DOM onLoad), then open the print dialog and tear the grid back down.
  async function startPrint() {
    if (printable.length === 0 || printing) return;
    setPrinting(true);
    try {
      await Promise.all(
        printable.map(
          (o) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => resolve();
              img.onerror = () => resolve();
              img.src = `/api/orders/${o.id}/image`;
            })
        )
      );
      window.print();
    } finally {
      setPrinting(false);
    }
  }

  async function toggleStatus(o: Transaction) {
    if (!o.id) return;
    const next: OrderStatus = o.status === "completed" ? "processing" : "completed";
    // Marking an order "Selesai" also deletes its attached file (Drive + DB).
    const shouldDeleteFile = next === "completed" && !!o.image_drive_id;
    if (
      shouldDeleteFile &&
      !confirm("Tandai selesai & hapus file order ini?")
    ) {
      return;
    }
    setBusyId(o.id);
    setError("");
    const supabase = createClient();
    try {
      await updateOrderStatus(supabase, o.id, next);
      if (shouldDeleteFile) {
        const res = await fetch(`/api/orders/${o.id}/image`, { method: "DELETE" });
        if (!res.ok) throw new Error();
      }
      setOrders((prev) =>
        prev.map((x) =>
          x.id === o.id
            ? {
                ...x,
                status: next,
                ...(shouldDeleteFile
                  ? { image_drive_id: null, image_name: null }
                  : {}),
              }
            : x
        )
      );
    } catch {
      setError("Gagal mengubah status.");
    } finally {
      setBusyId(null);
    }
  }

  function clearPasteErr(id: string) {
    setPasteErr((p) => {
      if (!p[id]) return p;
      const n = { ...p };
      delete n[id];
      return n;
    });
  }
  function showPasteErr(id: string, msg: string) {
    setPasteErr((p) => ({ ...p, [id]: msg }));
  }

  async function handleUpload(o: Transaction, file: File) {
    if (!o.id) return;
    setBusyId(o.id);
    clearPasteErr(o.id);
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
      showPasteErr(o.id, "Gagal mengunggah file.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemoveImage(o: Transaction) {
    if (!o.id || !confirm("Hapus file order ini?")) return;
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
      setError("Gagal menghapus file.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Putuskan koneksi Google Drive?")) return;
    setError("");
    try {
      const res = await fetch("/api/google/disconnect", { method: "POST" });
      if (!res.ok) throw new Error();
      setConn(false);
    } catch {
      setError("Gagal memutuskan koneksi Google Drive.");
    }
  }

  // Per-row paste: read a PDF or image from the clipboard and upload it straight
  // to this order. On iOS the async Clipboard API only ever yields images (never
  // PDFs) — that's expected and still useful.
  async function pasteForOrder(o: Transaction) {
    if (!canManagePdf || !conn || !o.id) return;
    clearPasteErr(o.id);
    try {
      if (!navigator.clipboard?.read) throw new Error("unsupported");
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find(
          (t) => t === "application/pdf" || t.startsWith("image/")
        );
        if (!type) continue;
        const blob = await item.getType(type);
        const ext = type === "application/pdf" ? "pdf" : type.split("/")[1] || "png";
        const file = new File([blob], `clipboard.${ext}`, { type });
        handleUpload(o, file);
        return;
      }
      showPasteErr(o.id, "Tidak ada file di clipboard.");
    } catch {
      showPasteErr(o.id, "Tidak ada file di clipboard.");
    }
  }

  // Desktop Ctrl+V: paste a PDF or image onto the selected order. Click a row to
  // select it, then Ctrl+V.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (!canManagePdf || !selectedId || !conn) return;
      const file = attachmentFromDataTransfer(e.clipboardData);
      if (!file) return;
      const order = orders.find((o) => o.id === selectedId);
      if (!order) return;
      e.preventDefault();
      handleUpload(order, file);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, conn, orders]);

  return (
    <>
    <div className="admin-shell px-6 pb-10 pt-[92px] queue-screen">
      <AdminNav active="queue" role={role} />
      <div className="admin-content max-w-5xl mx-auto">
        <div className="mb-8 admin-rise flex items-end justify-between gap-4">
          <div>
            <p className="admin-eyebrow">Ruslie Spring Admin</p>
            <h1 className="admin-title text-3xl mt-1">Queue</h1>
          </div>
          <button
            onClick={startPrint}
            disabled={printable.length === 0 || printing}
            className="admin-btn whitespace-nowrap disabled:opacity-40"
            title={
              printable.length
                ? `Cetak ${printable.length} file (4 per halaman A4)`
                : "Tidak ada file untuk dicetak"
            }
          >
            {printing ? <span className="admin-spinner-xs" /> : <Printer size={15} />}
            Print ({printable.length})
          </button>
        </div>

        {/* Google connect banner */}
        {!conn && (
          <div className="admin-panel admin-rise rounded-2xl p-5 mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="admin-panel-heading flex items-center gap-2">
                <Link2 size={14} /> Hubungkan Google Drive
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Sambungkan akun Google untuk mengunggah & melihat file order.
              </p>
            </div>
            <a href="/api/google/connect" className="admin-btn whitespace-nowrap">
              <Link2 size={14} /> Connect Google Account
            </a>
          </div>
        )}
        {/* Connected status + disconnect (editors only) */}
        {conn && canManagePdf && (
          <div className="admin-panel rounded-2xl px-5 py-3 mb-6 flex items-center justify-between gap-4">
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <Link2 size={14} className="shrink-0" /> Google Drive terhubung.
            </p>
            <button
              onClick={handleDisconnect}
              className="admin-btn-ghost whitespace-nowrap"
            >
              <Unlink size={14} /> Putuskan
            </button>
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
              {!conn ? (
                "Hubungkan Google Drive untuk mengunggah file."
              ) : selectedOrder ? (
                <>
                  Order{" "}
                  <span className="font-semibold text-[#021d47]">
                    {selectedOrder.invoice_number}
                  </span>{" "}
                  dipilih — tempel (Ctrl+V) file dari clipboard untuk mengunggah.
                </>
              ) : (
                "Klik satu order untuk memilih, lalu tempel (Ctrl+V) file dari clipboard."
              )}
            </p>
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
                <th>File</th>
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
                        {/* Paste PDF/image from clipboard (editors only) */}
                        {canManagePdf && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => pasteForOrder(o)}
                              disabled={!conn || busyId === o.id}
                              className="text-gray-400 hover:text-[#021d47] transition-colors disabled:opacity-40"
                              title={conn ? "Tempel file dari clipboard" : "Hubungkan Google dulu"}
                            >
                              {busyId === o.id ? (
                                <span className="admin-spinner-xs" />
                              ) : (
                                <ClipboardPaste size={17} />
                              )}
                            </button>
                            {o.id && pasteErr[o.id] && (
                              <span className="text-xs text-red-500 whitespace-nowrap">
                                {pasteErr[o.id]}
                              </span>
                            )}
                          </div>
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
                          title="Lihat file"
                        >
                          <Eye size={16} /> Lihat File
                        </a>
                        {/* Remove image (editors only) */}
                        {o.image_drive_id && canManagePdf && (
                          <button
                            onClick={() => handleRemoveImage(o)}
                            disabled={busyId === o.id}
                            className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-60"
                            title="Hapus file"
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

    {/* Print layout — built only while printing, off-screen until the print
        dialog opens. Each A4 page holds a 2×2 grid of A6 cells (4 files). */}
    {printing && (
      <div className="queue-print" aria-hidden>
        {printPages.map((page, pi) => (
          <div className="print-page" key={pi}>
            {page.map((o, ci) => (
              <div className="print-cell" key={ci}>
                {o?.image_drive_id && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/orders/${o.id}/image`}
                    alt={o.invoice_number ?? ""}
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    )}
    </>
  );
}

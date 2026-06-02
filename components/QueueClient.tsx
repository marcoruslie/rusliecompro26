"use client";

import { useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Upload,
  Eye,
  Trash2,
  CheckCircle2,
  RotateCcw,
  FileText,
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

        {/* Table */}
        <div className="admin-panel admin-rise rounded-2xl overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Tanggal</th>
                <th>PDF</th>
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
                          <FileText size={13} /> Ada
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
                          accept="application/pdf"
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
                          title={connected ? "Upload PDF" : "Hubungkan Google dulu"}
                        >
                          {busyId === o.id ? (
                            <span className="admin-spinner-xs" />
                          ) : (
                            <Upload size={15} />
                          )}
                        </button>
                        {/* View PDF in a new tab */}
                        <a
                          href={o.image_drive_id ? `/api/orders/${o.id}/image` : undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={
                            o.image_drive_id
                              ? "text-gray-400 hover:text-[#021d47] transition-colors"
                              : "text-gray-300 pointer-events-none"
                          }
                          title="Lihat PDF"
                        >
                          <Eye size={15} />
                        </a>
                        {/* Remove image */}
                        {o.image_drive_id && (
                          <button
                            onClick={() => handleRemoveImage(o)}
                            disabled={busyId === o.id}
                            className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-60"
                            title="Hapus PDF"
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

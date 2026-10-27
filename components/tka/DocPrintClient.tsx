"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { DOC_BY_JNL, getPath } from "@/lib/tka/docs";
import { db, errMsg, fetchAll, lookups, type Doc, type DocLine, type Setting } from "@/lib/tka/data";
import { fmtDate, fmtDateLong, fmtNum, fmtNumZ, terbilang } from "@/lib/tka/format";

type Party = { name: string; lines: string[] };

export default function DocPrintClient({ jnl, id, variant }: { jnl: string; id: string; variant?: string }) {
  const cfg = DOC_BY_JNL[jnl];
  const [doc, setDoc] = useState<Doc | null>(null);
  const [lines, setLines] = useState<DocLine[]>([]);
  const [setting, setSetting] = useState<Setting | null>(null);
  const [party, setParty] = useState<Party | null>(null);
  const [accNames, setAccNames] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await db().from("tka_doc").select("*").eq("id", Number(id)).single();
        if (error) throw error;
        const d = data as Doc;
        const [ls, st] = await Promise.all([
          fetchAll<DocLine>((a, b) => db().from("tka_doc_line").select("*").eq("doc_id", d.id).order("urut").range(a, b)),
          lookups.setting(),
        ]);
        setDoc(d);
        setLines(ls);
        setSetting(st);
        if (cfg.balanced) {
          const accs = await lookups.acc();
          setAccNames(new Map(accs.map((a) => [a.acc, a.name])));
        }
        if (d.sub && cfg.sub === "cus") {
          const { data: c } = await db().from("tka_cus").select("*").eq("cus", d.sub).maybeSingle();
          if (c) setParty({ name: c.name, lines: [c.address1, c.address2, c.address3, c.address4, c.city].filter(Boolean) });
        } else if (d.sub && cfg.sub === "sup") {
          const { data: s } = await db().from("tka_sup").select("*").eq("sup", d.sub).maybeSingle();
          if (s) setParty({ name: s.name, lines: [s.address1, s.address2, s.city].filter(Boolean) });
        }
        if (!d.sub || cfg.sub === "pekerja") setParty({ name: d.subname, lines: [] });
      } catch (e) {
        setError(errMsg(e));
      }
    })();
  }, [id, cfg]);

  if (error) return <p className="p-8 text-red-600">⚠ {error}</p>;
  if (!doc || !setting) return <p className="p-8 text-gray-500">Memuat…</p>;

  const isSJ = variant === "sj";
  const title = isSJ ? "SURAT JALAN" : cfg.printTitle;
  const cols = cfg.cols.filter((c) => c.print !== false && c.type !== "pekerja" && (!isSJ || !["price", "val", "d.hpp"].includes(c.path)));
  const h = doc.h ?? {};

  return (
    <div className="tka-print min-h-screen bg-white text-black">
      <div className="no-print sticky top-0 z-10 flex justify-end gap-2 bg-slate-100 p-3">
        <button className="admin-btn" onClick={() => window.print()}><Printer size={14} /> Cetak</button>
      </div>

      <div className="tka-sheet mx-auto max-w-[210mm] p-[12mm] text-[12px] leading-snug" style={{ fontFamily: "var(--font-mono), monospace" }}>
        <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-3">
          <div>
            <p className="text-[16px] font-bold">{setting.company_name}</p>
            <p>{setting.company_address}</p>
          </div>
          <div className="text-right">
            <p className="text-[18px] font-bold tracking-[0.3em]">{title}</p>
            <p>{(setting.company_address || "").split(",")[0]}, {fmtDateLong(doc.tanggal)}</p>
          </div>
        </div>

        <div className="flex justify-between gap-6 mb-3">
          <div>
            <p>NO. {isSJ ? "SURAT JALAN" : jnl === "JLH" ? "NOTA" : "BUKTI"} : <b>{isSJ ? String(h.sjno || doc.nomor) : doc.nomor}</b></p>
            {jnl === "JLH" && !isSJ && h.sjno ? <p>Untuk SJ No. {String(h.sjno)}</p> : null}
            {isSJ && <p>Nota No. {doc.nomor}</p>}
            {jnl === "JLH" && !isSJ && <p>{String(h.paid ?? "")}{h.duedate && h.paid === "KREDIT" ? ` · Jatuh tempo ${fmtDate(String(h.duedate))}` : ""}</p>}
            {doc.rem && <p>Ket. : {doc.rem}</p>}
          </div>
          {party && (
            <div className="min-w-[45%]">
              <p>{cfg.sub === "pekerja" ? "Pekerja" : cfg.sub === "sup" ? "Kepada / Dari" : "Kepada Yth."}</p>
              <p className="font-bold">{party.name}</p>
              {party.lines.map((l, i) => <p key={i}>{l}</p>)}
            </div>
          )}
        </div>

        {cfg.balanced ? (
          <table className="w-full border-collapse mb-3">
            <thead>
              <tr className="border-y border-black">
                <th className="text-left py-1 pr-2">AKUN</th>
                <th className="text-left py-1 pr-2">KETERANGAN</th>
                <th className="text-right py-1 pl-2">DEBET</th>
                <th className="text-right py-1 pl-2">KREDIT</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="align-top">
                  <td className="pr-2 py-0.5 whitespace-nowrap">{l.acc}<br /><span className="text-[10px]">{accNames.get(l.acc)}</span></td>
                  <td className="pr-2 py-0.5">{l.rem}{l.nota ? ` (Nota ${l.nota})` : ""}{l.d?.bg ? ` [${String(l.d.bg)}]` : ""}</td>
                  <td className="text-right pl-2 py-0.5 tabular-nums">{l.dk === "D" ? fmtNum(l.val) : ""}</td>
                  <td className="text-right pl-2 py-0.5 tabular-nums">{l.dk === "K" ? fmtNum(l.val) : ""}</td>
                </tr>
              ))}
              <tr className="border-t border-black font-bold">
                <td colSpan={2} className="py-1">JUMLAH</td>
                <td className="text-right tabular-nums">{fmtNum(lines.reduce((s, l) => s + (l.dk === "D" ? Number(l.val) : 0), 0))}</td>
                <td className="text-right tabular-nums">{fmtNum(lines.reduce((s, l) => s + (l.dk === "K" ? Number(l.val) : 0), 0))}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <table className="w-full border-collapse mb-3">
            <thead>
              <tr className="border-y border-black">
                {cols.map((c) => (
                  <th key={c.path} className={`py-1 px-1 ${c.type === "number" ? "text-right" : "text-left"}`}>{c.label.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="align-top">
                  {cols.map((c) => {
                    const v = getPath(l as unknown as Record<string, unknown>, c.path);
                    return (
                      <td key={c.path} className={`px-1 py-0.5 ${c.type === "number" ? "text-right tabular-nums" : ""}`}>
                        {c.type === "number" ? fmtNumZ(Number(v), c.path === "qty" ? 0 : 2) : c.type === "inv" ? `${l.inv ? `${l.inv} ` : ""}${l.invname}` : c.type === "date" ? fmtDate(String(v ?? "")) : String(v ?? "")}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!cfg.balanced && !isSJ && doc.total !== 0 && (
          <div className="flex justify-between items-start border-t border-black pt-2 mb-6">
            <p className="italic max-w-[60%]">{terbilang(Number(doc.total))}</p>
            <div className="text-right space-y-0.5">
              {Number(h.discval) ? <p>DISKON : {fmtNum(Number(h.discval))}</p> : null}
              {Number(h.ppnval) ? <p>PPN : {fmtNum(Number(h.ppnval))}</p> : null}
              <p className="font-bold">JUMLAH : Rp. {fmtNum(doc.total)}</p>
            </div>
          </div>
        )}
        {cfg.balanced && <p className="italic mb-6">{terbilang(Number(doc.total))}</p>}

        <div className="grid grid-cols-3 gap-6 text-center mt-8">
          {(isSJ || jnl === "JLH" ? ["Tanda Terima", "Pengirim", "Hormat Kami"] : ["Penerima", "Diperiksa", "Dibuat"]).map((s) => (
            <div key={s}>
              <p>{s},</p>
              <div className="h-16" />
              <p>(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

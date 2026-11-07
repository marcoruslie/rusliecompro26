import Link from "next/link";
import { requireTkaAdmin } from "@/lib/tka/auth";
import { REPORTS, REPORT_GROUPS } from "@/lib/tka/reports";
import TkaShell from "@/components/tka/TkaShell";

export const metadata = { title: "Laporan — TKA" };

export default async function TkaReportsPage() {
  await requireTkaAdmin();
  return (
    <TkaShell active="laporan" title="Laporan Per-Periode" eyebrow="TKA · Laporan">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_GROUPS.map((g) => (
          <div key={g} className="admin-panel rounded-2xl p-5">
            <p className="admin-panel-heading mb-3">{g}</p>
            <ul className="space-y-1">
              {REPORTS.filter((r) => r.group === g).map((r) => (
                <li key={r.key}>
                  <Link href={`/admin/tka/laporan/${r.key}`} className="block rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#021d47]">
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </TkaShell>
  );
}

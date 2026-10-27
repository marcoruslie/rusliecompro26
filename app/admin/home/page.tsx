import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { roleFromUser } from "@/lib/auth";
import AdminSignOutButton from "@/components/AdminSignOutButton";

export const metadata = { title: "Pilih Modul — Admin" };

const MODULES = [
  {
    href: "/admin/tka",
    badge: "TKA",
    title: "TKA",
    desc: "Penjualan, pembelian, produksi & persediaan, kas/bank, hutang/piutang dan laporan keuangan — data program lama sejak 2000.",
  },
  {
    href: "/admin/dashboard",
    badge: "R",
    title: "Ruslie Spring",
    desc: "Dashboard, transaksi & antrian order, customer, karyawan, barang dan gudang Ruslie Spring.",
  },
];

export default async function AdminHomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin");
  if (roleFromUser(user) === "viewer") redirect("/admin/queue");

  return (
    <div className="admin-shell !ml-0 flex items-center justify-center px-4 py-12">
      <div className="admin-content w-full max-w-3xl">
        <div className="text-center mb-8 admin-rise">
          <p className="admin-eyebrow">Admin</p>
          <h1 className="admin-title text-3xl mt-1">Pilih Modul</h1>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          {MODULES.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="admin-panel admin-rise group rounded-2xl p-7 flex flex-col gap-4 transition-transform hover:-translate-y-0.5"
            >
              <div className={`admin-badge w-14 h-14 rounded-2xl ${m.badge.length > 1 ? "text-sm" : "text-2xl"}`}>{m.badge}</div>
              <div>
                <p className="admin-title text-2xl">{m.title}</p>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">{m.desc}</p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-[#021d47]">
                Buka <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
        <div className="flex justify-center mt-8">
          <AdminSignOutButton />
        </div>
      </div>
    </div>
  );
}

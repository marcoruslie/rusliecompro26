"use client";

import Link from "next/link";
import { Home, Users, Cable, FileText, ListChecks } from "lucide-react";
import AdminSignOutButton from "@/components/AdminSignOutButton";

export type AdminPage = "dashboard" | "customers" | "wires" | "transaction" | "queue";

const LINKS = [
  { key: "dashboard", href: "/admin/dashboard", label: "Dashboard", Icon: Home },
  { key: "customers", href: "/admin/customers", label: "Customers", Icon: Users },
  { key: "wires", href: "/admin/wires", label: "Wires", Icon: Cable },
  { key: "transaction", href: "/admin/transactions/new", label: "Transaction", Icon: FileText },
  { key: "queue", href: "/admin/queue", label: "Queue", Icon: ListChecks },
] as const;

export default function AdminNav({ active }: { active: AdminPage }) {
  return (
    <nav
      className="no-print fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-10 h-[68px]"
      style={{
        background: "rgba(2,29,71,0.97)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <Link href="/admin/dashboard" className="flex items-center gap-2.5">
        <div className="admin-badge w-8 h-8 rounded-lg text-base">R</div>
      </Link>

      <div className="flex items-center gap-5">
        {LINKS.map(({ key, href, label, Icon }) =>
          key === active ? (
            <span
              key={key}
              className="text-white text-[0.78rem] tracking-widest uppercase flex items-center gap-1.5"
            >
              <Icon size={12} /> {label}
            </span>
          ) : (
            <Link
              key={key}
              href={href}
              className="hidden sm:flex items-center gap-1.5 text-white/55 hover:text-white text-[0.78rem] tracking-widest uppercase transition-colors"
            >
              <Icon size={12} /> {label}
            </Link>
          )
        )}
        <AdminSignOutButton />
      </div>
    </nav>
  );
}

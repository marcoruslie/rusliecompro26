"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Users,
  Cable,
  FileText,
  ListChecks,
  Warehouse,
  MapPin,
  Package,
  UserCog,
  Percent,
  ArrowLeftRight,
  Menu,
  X,
} from "lucide-react";
import AdminSignOutButton from "@/components/AdminSignOutButton";
import type { AppRole } from "@/lib/auth";

export type AdminPage =
  | "dashboard"
  | "customers"
  | "wires"
  | "transaction"
  | "queue"
  | "warehouses"
  | "storage-locations"
  | "items"
  | "employees"
  | "marketplace-fees";

const GROUPS = [
  {
    label: "Overview",
    links: [{ key: "dashboard", href: "/admin/dashboard", label: "Dashboard", Icon: Home }],
  },
  {
    label: "Transaksi",
    links: [
      { key: "transaction", href: "/admin/transactions/new", label: "Transaction", Icon: FileText },
      { key: "queue", href: "/admin/queue", label: "Queue", Icon: ListChecks },
    ],
  },
  {
    label: "Master Data",
    links: [
      { key: "customers", href: "/admin/customers", label: "Customers", Icon: Users },
      { key: "employees", href: "/admin/employees", label: "Karyawan", Icon: UserCog },
      { key: "wires", href: "/admin/wires", label: "Wires", Icon: Cable },
      { key: "items", href: "/admin/items", label: "Items", Icon: Package },
      { key: "marketplace-fees", href: "/admin/marketplace-fees", label: "Biaya Shopee", Icon: Percent },
    ],
  },
  {
    label: "Gudang",
    links: [
      { key: "warehouses", href: "/admin/warehouses", label: "Warehouses", Icon: Warehouse },
      { key: "storage-locations", href: "/admin/storage-locations", label: "Locations", Icon: MapPin },
    ],
  },
] as const;

const NAV_STYLE = {
  background: "rgba(2,29,71,0.97)",
  backdropFilter: "blur(14px)",
  fontFamily: "var(--font-dm-sans)",
} as const;

function SidebarBody({
  active,
  role,
  onNavigate,
}: {
  active: AdminPage;
  role: AppRole;
  onNavigate?: () => void;
}) {
  // Viewers can only reach the Queue, so don't surface links they can't open.
  const groups =
    role === "viewer"
      ? GROUPS.map((g) => ({ ...g, links: g.links.filter((l) => l.key === "queue") })).filter(
          (g) => g.links.length > 0
        )
      : GROUPS;
  const homeHref = role === "viewer" ? "/admin/queue" : "/admin/dashboard";

  return (
    <div className="flex h-full flex-col">
      <Link
        href={homeHref}
        onClick={onNavigate}
        className="flex items-center gap-2.5 px-5 h-[68px] shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="admin-badge w-8 h-8 rounded-lg text-base">R</div>
        <span className="leading-tight">
          <span className="block text-white text-sm font-semibold">Ruslie Spring</span>
          <span className="block text-white/40 text-[0.62rem] tracking-[0.2em] uppercase">Admin</span>
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((g) => (
          <div key={g.label} className="mb-5 last:mb-0">
            <p className="px-3 mb-1.5 text-white/30 text-[0.62rem] tracking-[0.2em] uppercase">
              {g.label}
            </p>
            {g.links.map(({ key, href, label, Icon }) => {
              const isActive = key === active;
              return (
                <Link
                  key={key}
                  href={href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 mb-0.5 text-[0.82rem] transition-colors ${
                    isActive
                      ? "bg-white/10 text-white font-semibold"
                      : "text-white/55 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon size={15} /> {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="px-4 py-4 shrink-0 flex flex-col gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        {role !== "viewer" && (
          <Link
            href="/admin/home"
            onClick={onNavigate}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[0.8rem] text-white/70 hover:text-white hover:bg-white/5"
          >
            <ArrowLeftRight size={14} /> Ganti Modul
          </Link>
        )}
        <AdminSignOutButton />
      </div>
    </div>
  );
}

export default function AdminNav({
  active,
  role = "admin",
}: {
  active: AdminPage;
  role?: AppRole;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile drawer on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <>
      {/* Desktop: fixed sidebar. Pages offset themselves via `.admin-shell` (globals.css). */}
      <aside
        className="no-print no-print-nav hidden lg:block fixed inset-y-0 left-0 z-50 w-[240px]"
        style={{ ...NAV_STYLE, borderRight: "1px solid rgba(255,255,255,0.07)" }}
      >
        <SidebarBody active={active} role={role} />
      </aside>

      {/* Mobile: slim top bar with a menu button that opens the sidebar as a drawer */}
      <div
        className="no-print no-print-nav lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-[68px]"
        style={{ ...NAV_STYLE, borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <button
          className="text-white/70 hover:text-white p-1 transition-colors"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <div className="admin-badge w-8 h-8 rounded-lg text-base">R</div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="no-print lg:hidden fixed inset-0 z-[60] bg-black/40"
              onClick={() => setMenuOpen(false)}
            />
            <motion.aside
              key="drawer"
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.22 }}
              className="no-print lg:hidden fixed inset-y-0 left-0 z-[70] w-[240px]"
              style={NAV_STYLE}
            >
              <button
                className="absolute top-5 right-4 text-white/60 hover:text-white p-1"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
              <SidebarBody active={active} role={role} onNavigate={() => setMenuOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

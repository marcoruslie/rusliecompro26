"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  ShoppingCart,
  Truck,
  Factory,
  Wallet,
  BarChart3,
  Database,
  Settings,
  ArrowLeftRight,
  Menu,
  X,
} from "lucide-react";
import AdminSignOutButton from "@/components/AdminSignOutButton";
import { DOCS } from "@/lib/tka/docs";
import { MASTERS } from "@/lib/tka/masters";

type NavLink = { key: string; href: string; label: string };
type NavGroup = { label: string; Icon: typeof Home; links: NavLink[] };

const docLinks = (group: string): NavLink[] =>
  DOCS.filter((d) => d.group === group).map((d) => ({ key: `dok-${d.jnl}`, href: `/admin/tka/dok/${d.jnl}`, label: d.short }));

const GROUPS: NavGroup[] = [
  { label: "Overview", Icon: Home, links: [{ key: "dashboard", href: "/admin/tka", label: "Dashboard" }] },
  { label: "Penjualan", Icon: ShoppingCart, links: docLinks("Penjualan") },
  { label: "Pembelian", Icon: Truck, links: docLinks("Pembelian") },
  { label: "Produksi & Persediaan", Icon: Factory, links: docLinks("Produksi & Persediaan") },
  {
    label: "Kas / Bank",
    Icon: Wallet,
    links: [...docLinks("Kas / Bank"), { key: "giro", href: "/admin/tka/giro", label: "Pencairan Cek/Giro" }],
  },
  { label: "Laporan", Icon: BarChart3, links: [{ key: "laporan", href: "/admin/tka/laporan", label: "Semua Laporan" }] },
  {
    label: "Master",
    Icon: Database,
    links: MASTERS.map((m) => ({ key: `master-${m.key}`, href: `/admin/tka/master/${m.key}`, label: m.title })),
  },
  {
    label: "Utilitas",
    Icon: Settings,
    links: [
      { key: "pengaturan", href: "/admin/tka/pengaturan", label: "Pengaturan Akun" },
      { key: "tutup-tahun", href: "/admin/tka/tutup-tahun", label: "Tutup Tahun" },
    ],
  },
];

const NAV_STYLE = {
  background: "rgba(2,29,71,0.97)",
  backdropFilter: "blur(14px)",
  fontFamily: "var(--font-dm-sans)",
} as const;

function SidebarBody({ active, onNavigate }: { active: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <Link
        href="/admin/tka"
        onClick={onNavigate}
        className="flex items-center gap-2.5 px-5 h-[68px] shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="admin-badge w-8 h-8 rounded-lg text-[0.7rem]">TKA</div>
        <span className="leading-tight">
          <span className="block text-white text-sm font-semibold">TKA</span>
          <span className="block text-white/40 text-[0.62rem] tracking-[0.2em] uppercase">Akuntansi & Produksi</span>
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {GROUPS.map(({ label, Icon, links }) => (
          <div key={label} className="mb-4 last:mb-0">
            <p className="px-3 mb-1 flex items-center gap-1.5 text-white/30 text-[0.6rem] tracking-[0.18em] uppercase">
              <Icon size={11} /> {label}
            </p>
            {links.map((l) => {
              const isActive = l.key === active;
              return (
                <Link
                  key={l.key}
                  href={l.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={`block rounded-lg px-3 py-1.5 mb-0.5 text-[0.8rem] transition-colors ${
                    isActive ? "bg-white/10 text-white font-semibold" : "text-white/55 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="px-4 py-4 shrink-0 flex flex-col gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <Link
          href="/admin/home"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-[0.8rem] text-white/70 hover:text-white hover:bg-white/5"
        >
          <ArrowLeftRight size={14} /> Ganti Modul
        </Link>
        <AdminSignOutButton />
      </div>
    </div>
  );
}

export default function TkaShell({
  active,
  title,
  eyebrow = "TKA",
  actions,
  children,
  wide = false,
}: {
  active: string;
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className="admin-shell px-4 sm:px-6 pb-10 pt-[92px] lg:pt-8">
      <aside
        className="no-print hidden lg:block fixed inset-y-0 left-0 z-50 w-[240px]"
        style={{ ...NAV_STYLE, borderRight: "1px solid rgba(255,255,255,0.07)" }}
      >
        <SidebarBody active={active} />
      </aside>

      <div
        className="no-print lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-[68px]"
        style={{ ...NAV_STYLE, borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <button className="text-white/70 hover:text-white p-1" onClick={() => setMenuOpen(true)} aria-label="Buka menu">
          <Menu size={22} />
        </button>
        <div className="admin-badge w-8 h-8 rounded-lg text-[0.7rem]">TKA</div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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
                aria-label="Tutup menu"
              >
                <X size={20} />
              </button>
              <SidebarBody active={active} onNavigate={() => setMenuOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className={`admin-content mx-auto ${wide ? "max-w-[1400px]" : "max-w-6xl"}`}>
        <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="admin-eyebrow">{eyebrow}</p>
            <h1 className="admin-title text-2xl sm:text-3xl mt-1">{title}</h1>
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

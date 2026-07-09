"use client";

import { useState } from "react";
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
  | "items";

const LINKS = [
  { key: "dashboard", href: "/admin/dashboard", label: "Dashboard", Icon: Home },
  { key: "customers", href: "/admin/customers", label: "Customers", Icon: Users },
  { key: "wires", href: "/admin/wires", label: "Wires", Icon: Cable },
  { key: "items", href: "/admin/items", label: "Items", Icon: Package },
  { key: "warehouses", href: "/admin/warehouses", label: "Warehouses", Icon: Warehouse },
  { key: "storage-locations", href: "/admin/storage-locations", label: "Locations", Icon: MapPin },
  { key: "transaction", href: "/admin/transactions/new", label: "Transaction", Icon: FileText },
  { key: "queue", href: "/admin/queue", label: "Queue", Icon: ListChecks },
] as const;

export default function AdminNav({
  active,
  role = "admin",
}: {
  active: AdminPage;
  role?: AppRole;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  // Viewers can only reach the Queue, so don't surface links they can't open.
  const links = role === "viewer" ? LINKS.filter((l) => l.key === "queue") : LINKS;
  const homeHref = role === "viewer" ? "/admin/queue" : "/admin/dashboard";
  return (
    <>
      <nav
        className="no-print fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-10 h-[68px]"
        style={{
          background: "rgba(2,29,71,0.97)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          fontFamily: "var(--font-dm-sans)",
        }}
      >
        <Link href={homeHref} className="flex items-center gap-2.5">
          <div className="admin-badge w-8 h-8 rounded-lg text-base">R</div>
        </Link>

        <div className="flex items-center gap-5">
          {links.map(({ key, href, label, Icon }) =>
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
          {links.length > 1 && (
            <button
              className="sm:hidden text-white/70 hover:text-white p-1 transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          )}
        </div>
      </nav>

      {/* Mobile menu panel — all admin pages, since the bar only shows the active one */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22 }}
            className="no-print fixed top-[68px] left-0 right-0 z-40 sm:hidden"
            style={{
              background: "rgba(2,29,71,0.97)",
              backdropFilter: "blur(14px)",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            <div className="flex flex-col px-6 py-4">
              {links.map(({ key, href, label, Icon }) => (
                <Link
                  key={key}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-2.5 py-3 text-[0.8rem] tracking-widest uppercase transition-colors border-b border-white/5 last:border-b-0 ${
                    key === active
                      ? "text-white font-semibold"
                      : "text-white/55 hover:text-white"
                  }`}
                >
                  <Icon size={14} /> {label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

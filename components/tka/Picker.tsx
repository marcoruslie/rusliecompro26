"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type PickItem = { value: string; label: string; hint?: string; data?: unknown };

/**
 * Type-to-search combobox. Shows the code; the dropdown lists code + name.
 * The list renders in a portal so it isn't clipped by scrolling table wrappers.
 */
export default function Picker({
  items,
  value,
  onPick,
  placeholder,
  className = "",
  display,
  disabled,
}: {
  items: PickItem[];
  value: string;
  onPick: (item: PickItem | null) => void;
  placeholder?: string;
  className?: string;
  display?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const current = useMemo(() => items.find((i) => i.value === value), [items, value]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items.slice(0, 60);
    const words = t.split(/\s+/);
    const out: PickItem[] = [];
    for (const i of items) {
      const hay = `${i.value} ${i.label} ${i.hint ?? ""}`.toLowerCase();
      if (words.every((w) => hay.includes(w))) out.push(i);
      if (out.length >= 60) break;
    }
    return out;
  }, [items, q]);

  useEffect(() => setHi(0), [q]);

  useEffect(() => {
    if (!open) return;
    const update = () => inputRef.current && setRect(inputRef.current.getBoundingClientRect());
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  function choose(i: PickItem | null) {
    onPick(i);
    setOpen(false);
    setQ("");
  }

  const shown = open ? q : display ?? (current ? `${current.value} — ${current.label}` : value);

  return (
    <>
      <input
        ref={inputRef}
        value={shown}
        disabled={disabled}
        placeholder={placeholder}
        className={`admin-input ${className}`}
        onFocus={() => {
          setOpen(true);
          setQ("");
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHi((h) => Math.min(h + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHi((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (filtered[hi]) choose(filtered[hi]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && rect &&
        createPortal(
          <div
            className="fixed z-[200] max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl text-sm"
            style={{ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 340) }}
          >
            {value && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(null)}
                className="block w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50"
              >
                Kosongkan
              </button>
            )}
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-slate-400 italic">Tidak ditemukan.</p>
            ) : (
              filtered.map((i, idx) => (
                <button
                  type="button"
                  key={`${i.value}-${idx}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(i)}
                  className={`block w-full text-left px-3 py-1.5 ${idx === hi ? "bg-blue-50" : "hover:bg-slate-50"}`}
                >
                  <span className="font-mono text-[0.75rem] text-[#021d47]">{i.value}</span>
                  <span className="ml-2 text-slate-700">{i.label}</span>
                  {i.hint && <span className="ml-2 text-[0.7rem] text-slate-400">{i.hint}</span>}
                </button>
              ))
            )}
          </div>,
          document.body
        )}
    </>
  );
}

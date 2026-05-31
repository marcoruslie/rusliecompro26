"use client";

import type { Customer } from "@/lib/types";

export default function CustomerSelect({
  customers,
  value,
  onSelect,
}: {
  customers: Customer[];
  value: string | null | undefined;
  onSelect: (customer: Customer | null) => void;
}) {
  return (
    <div className="col-span-2">
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
        Pilih Customer (opsional)
      </label>
      <select
        value={value ?? ""}
        onChange={(e) => {
          const picked = customers.find((c) => c.id === e.target.value) ?? null;
          onSelect(picked);
        }}
        className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:border-blue-400 transition-colors no-print"
      >
        <option value="">— Customer baru / ketik manual —</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.city ? ` — ${c.city}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

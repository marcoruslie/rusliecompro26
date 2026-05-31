"use client";

import type { Wire } from "@/lib/types";

export default function WireSelect({
  wires,
  value,
  onSelect,
}: {
  wires: Wire[];
  value: string | null | undefined;
  onSelect: (wire: Wire | null) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => {
        const picked = wires.find((w) => w.wire_id === e.target.value) ?? null;
        onSelect(picked);
      }}
      className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-400 transition-colors"
    >
      <option value="">— Pilih Wire —</option>
      {wires.map((w) => (
        <option key={w.wire_id} value={w.wire_id}>
          {w.name}
        </option>
      ))}
    </select>
  );
}

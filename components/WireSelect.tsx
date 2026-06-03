"use client";

import type { Wire, WireType } from "@/lib/types";

export default function WireSelect({
  wires,
  types = [],
  value,
  onSelect,
}: {
  wires: Wire[];
  types?: WireType[];
  value: string | null | undefined;
  onSelect: (wire: Wire | null) => void;
}) {
  function typeNameOf(w: Wire): string {
    return types.find((t) => t.type_id === w.type_id)?.name ?? "";
  }

  function labelOf(w: Wire): string {
    const typeName = typeNameOf(w);
    return typeName ? `${w.name} — ${typeName}` : w.name;
  }

  const sortedWires = [...wires].sort(
    (a, b) =>
      a.name.localeCompare(b.name) || typeNameOf(a).localeCompare(typeNameOf(b))
  );

  return (
    <select
      value={value ?? ""}
      onChange={(e) => {
        const picked = wires.find((w) => w.wire_id === e.target.value) ?? null;
        onSelect(picked);
      }}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:border-blue-400 transition-colors"
    >
      <option value="">
        {wires.length === 0 ? "— Belum ada wire —" : "— Pilih Wire —"}
      </option>
      {sortedWires.map((w) => (
        <option key={w.wire_id} value={w.wire_id}>
          {labelOf(w)}
        </option>
      ))}
    </select>
  );
}

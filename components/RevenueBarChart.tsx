"use client";

export interface BarDatum {
  label: string;
  value: number;
}

function formatShort(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}jt`;
  if (val >= 1_000) return `${Math.round(val / 1_000)}rb`;
  return String(val);
}

export default function RevenueBarChart({ data }: { data: BarDatum[] }) {
  if (data.length === 0) {
    return (
      <p className="text-gray-400 text-sm text-center py-10">Belum ada data revenue.</p>
    );
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-3 h-48 w-full overflow-x-auto pt-6">
      {data.map((d) => (
        <div key={d.label} className="flex flex-col items-center gap-1.5 flex-1 min-w-[40px]">
          <span className="text-[0.65rem] text-gray-500">{formatShort(d.value)}</span>
          <div
            className="w-full rounded-t-md transition-all"
            style={{
              height: `${(d.value / max) * 100}%`,
              minHeight: d.value > 0 ? "4px" : "0",
              background: "linear-gradient(180deg, #0b2255 0%, #021d47 100%)",
            }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="text-[0.65rem] text-gray-500 whitespace-nowrap">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

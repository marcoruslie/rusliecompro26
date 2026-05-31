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
      <p className="text-slate-500 text-sm text-center py-10 font-mono uppercase tracking-widest text-xs">
        Belum ada data revenue.
      </p>
    );
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-3 h-48 w-full overflow-x-auto pt-6">
      {data.map((d) => (
        <div key={d.label} className="group flex flex-col items-center gap-1.5 flex-1 min-w-[40px]">
          <span className="text-[0.65rem] font-mono text-cyan-300/80">{formatShort(d.value)}</span>
          <div
            className="w-full rounded-t-md transition-all duration-300 group-hover:brightness-125"
            style={{
              height: `${(d.value / max) * 100}%`,
              minHeight: d.value > 0 ? "4px" : "0",
              background: "linear-gradient(180deg, #38bdf8 0%, #22d3ee 45%, #6366f1 100%)",
              boxShadow: "0 0 14px -2px rgba(56,189,248,0.6), inset 0 1px 0 rgba(255,255,255,0.25)",
            }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="text-[0.65rem] font-mono text-slate-500 whitespace-nowrap">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

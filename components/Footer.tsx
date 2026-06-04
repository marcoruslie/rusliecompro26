export default function Footer() {
  return (
    <footer className="relative bg-graphite border-t border-white/[0.06] overflow-hidden">
      <div
        className="absolute inset-x-0 bottom-0 h-16 hud-blueprint pointer-events-none"
        style={{ opacity: 0.4 }}
      />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-8 flex flex-col sm:flex-row justify-between items-center gap-3 flex-wrap">
        <span className="font-tech text-hud-silver/45 text-[0.88rem]">
          © 2026{" "}
          <span className="text-cyan">Ruslie Spring</span>. All rights reserved.
        </span>
        <span className="font-mono text-hud-mute text-[0.66rem] tracking-[0.22em] uppercase">
          Precision · Reliability · Innovation
        </span>
      </div>
    </footer>
  );
}

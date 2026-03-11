export default function Footer() {
  return (
    <footer
      className="border-t border-white/7 px-6 lg:px-10 py-7 flex flex-col sm:flex-row justify-between items-center gap-3 flex-wrap"
      style={{ background: "#010e24" }}
    >
      <span className="font-display text-white/40 text-[0.88rem]">
        © 2026{" "}
        <span className="text-silver-DEFAULT">Ruslie Spring</span>. All rights
        reserved.
      </span>
      <span className="font-body text-white/18 text-[0.72rem] tracking-[0.15em]">
        PRECISION · RELIABILITY · INNOVATION
      </span>
    </footer>
  );
}

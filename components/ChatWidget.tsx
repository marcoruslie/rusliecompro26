"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Send, Sparkles, X } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useLanguage } from "@/lib/i18n";
import type { Lang } from "@/lib/translations";

const COPY: Record<
  Lang,
  { title: string; hint: string; placeholder: string; greeting: string; error: string; launcher: string; intro: string; introCta: string }
> = {
  en: {
    title: "Ask about price & availability",
    hint: "AI assistant · final quotes via WhatsApp",
    placeholder: "e.g. price for a stainless compression spring?",
    greeting: "Hi! Ask me about pricing or availability of our springs.",
    error: "Sorry, something went wrong. Please try again or contact us on WhatsApp.",
    launcher: "AI Chat",
    intro: "Hi, I'm Coily, Ruslie Spring's AI assistant! Ask me spring prices anytime.",
    introCta: "Chat with AI",
  },
  id: {
    title: "Tanya harga & ketersediaan",
    hint: "Asisten AI · penawaran final via WhatsApp",
    placeholder: "mis. harga pegas tekan stainless?",
    greeting: "Halo! Tanyakan harga atau ketersediaan pegas kami.",
    error: "Maaf, terjadi kesalahan. Silakan coba lagi atau hubungi kami via WhatsApp.",
    launcher: "Chat AI",
    intro: "Halo, saya Coily, asisten AI Ruslie Spring! Tanya harga pegas kapan saja.",
    introCta: "Chat dengan AI",
  },
  zh: {
    title: "咨询价格与供货",
    hint: "AI 助手 · 正式报价请通过 WhatsApp",
    placeholder: "例如：不锈钢压缩弹簧多少钱？",
    greeting: "您好！欢迎咨询我们弹簧的价格或供货情况。",
    error: "抱歉，出现错误。请重试或通过 WhatsApp 联系我们。",
    launcher: "AI 聊天",
    intro: "您好，我是 Coily，Ruslie Spring 的 AI 助手！随时问我弹簧价格。",
    introCta: "与 AI 聊天",
  },
};

export default function ChatWidget() {
  const { lang } = useLanguage();
  const copy = COPY[lang];
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  // Coily's intro bubble pops up shortly after load, once per session.
  const [intro, setIntro] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("chat-intro-seen")) return;
    const t = setTimeout(() => setIntro(true), 2500);
    return () => clearTimeout(t);
  }, []);

  function dismissIntro() {
    setIntro(false);
    sessionStorage.setItem("chat-intro-seen", "1");
  }

  function toggle() {
    dismissIntro();
    setOpen((o) => !o);
  }

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const busy = status === "submitted" || status === "streaming";
  const last = messages[messages.length - 1];
  const lastHasText = last?.role === "assistant" && last.parts.some((p) => p.type === "text" && p.text);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, status]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    sendMessage({ text }, { body: { lang } });
    setInput("");
  }

  return (
    <div className="fixed bottom-5 right-5 z-[60] font-body">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            className="mb-3 flex h-[min(520px,75vh)] w-[min(360px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-plate border border-rule-strong bg-surface text-ink shadow-plate-lift"
          >
            <div className="flex items-start justify-between gap-3 bg-navy px-4 py-3 text-white">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <Coily className="h-8 w-8" />
                </span>
                <div>
                  <p className="flex items-center gap-2 text-[0.92rem] font-semibold">
                    {copy.title} <AiBadge />
                  </p>
                  <p className="text-[0.72rem] text-white/60">{copy.hint}</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close chat" className="text-white/70 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-[0.88rem]">
              <Bubble role="assistant">{copy.greeting}</Bubble>
              {messages.map((m) => (
                <Bubble key={m.id} role={m.role}>
                  {m.parts.map((p, i) => (p.type === "text" ? <span key={i}>{linkify(p.text)}</span> : null))}
                </Bubble>
              ))}
              {busy && !lastHasText && <Bubble role="assistant">…</Bubble>}
              {error && <p className="text-[0.8rem] text-red-600">{copy.error}</p>}
            </div>

            <form onSubmit={submit} className="flex gap-2 border-t border-rule p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={2000}
                placeholder={copy.placeholder}
                className="flex-1 rounded-plate border border-rule-strong bg-surface px-3 py-2 text-[0.88rem] text-ink outline-none placeholder:text-ink-faint focus:border-navy"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Send"
                className="rounded-plate bg-navy px-3 text-white disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {intro && !open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            style={{ transformOrigin: "bottom right" }}
            className="relative mb-4 ml-auto w-[min(260px,calc(100vw-2.5rem))] rounded-plate border border-rule-strong bg-surface p-3 pr-8 text-ink shadow-plate-lift"
          >
            <button
              onClick={dismissIntro}
              aria-label="Dismiss"
              className="absolute right-2 top-2 text-ink-faint hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <p className="mb-2 text-[0.84rem] leading-snug">
              <AiBadge dark /> {copy.intro}
            </p>
            <button onClick={toggle} className="text-[0.8rem] font-semibold text-navy underline underline-offset-2">
              {copy.introCta} →
            </button>
            {/* tail pointing at the launcher */}
            <span className="absolute -bottom-[7px] right-10 h-3 w-3 rotate-45 border-b border-r border-rule-strong bg-surface" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative ml-auto w-fit">
        {/* attention ring while Coily is introducing itself */}
        {intro && !open && !reduceMotion && (
          <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-navy/30" />
        )}
        <motion.button
          onClick={toggle}
          aria-label={open ? "Close chat" : `${copy.launcher}: ${copy.title}`}
          aria-expanded={open}
          initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.8, type: "spring", stiffness: 220, damping: 14 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`relative flex h-14 items-center justify-center gap-2 rounded-full bg-navy text-white shadow-plate-lift ${
            open ? "w-14" : "pl-1.5 pr-5"
          }`}
        >
          {open ? (
            <X className="h-5 w-5" />
          ) : (
            <>
              <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
                <Coily className="h-9 w-9" animate={!reduceMotion} />
                <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-navy bg-green-400" />
                </span>
              </span>
              <span className="text-[0.9rem] font-semibold">{copy.launcher}</span>
              <Sparkles className="h-4 w-4 text-amber-300" />
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}

function AiBadge({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-[1px] align-middle text-[0.62rem] font-bold tracking-wider ${
        dark ? "bg-navy text-white" : "bg-white/15 text-white"
      }`}
    >
      <Sparkles className="h-2.5 w-2.5" /> AI
    </span>
  );
}

/** Coily — compression-spring mascot that bounces like a spring and blinks. */
function Coily({ className, animate = false }: { className?: string; animate?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <motion.g
        style={{ originX: "50%", originY: "100%" }}
        animate={animate ? { scaleY: [1, 0.82, 1.06, 1], y: [0, 0, -2, 0] } : undefined}
        transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }}
      >
        {/* coils */}
        {[24, 29, 34].map((y) => (
          <ellipse key={y} cx="20" cy={y} rx="11" ry="3" fill="none" stroke="#c9d3e2" strokeWidth="2.4" />
        ))}
        {/* head */}
        <circle cx="20" cy="13" r="9.5" fill="#ffffff" />
        <motion.g
          style={{ originX: "50%", originY: "50%" }}
          animate={animate ? { scaleY: [1, 1, 0.1, 1] } : undefined}
          transition={{ duration: 3.2, repeat: Infinity, times: [0, 0.9, 0.95, 1] }}
        >
          <circle cx="16.5" cy="12" r="1.7" fill="#021d47" />
          <circle cx="23.5" cy="12" r="1.7" fill="#021d47" />
        </motion.g>
        <path d="M16.5 16.2 Q20 19 23.5 16.2" fill="none" stroke="#021d47" strokeWidth="1.5" strokeLinecap="round" />
        {/* antenna — the "AI" tell */}
        <line x1="20" y1="3.5" x2="20" y2="1.8" stroke="#ffffff" strokeWidth="1.4" />
        <circle cx="20" cy="1.6" r="1.4" fill="#fbbf24" />
      </motion.g>
    </svg>
  );
}

function Bubble({ role, children }: { role: string; children: React.ReactNode }) {
  const mine = role === "user";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-plate px-3 py-2 ${
          mine ? "bg-navy text-white" : "bg-ground text-ink"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

// Make the WhatsApp/email contacts the assistant hands out tappable.
const LINK_RE = /(https?:\/\/[^\s)]+|[\w.+-]+@[\w-]+\.[\w.]+\w)/g;

function linkify(text: string) {
  return text.split(LINK_RE).map((part, i) => {
    if (i % 2 === 0) return part;
    const href = part.includes("@") && !part.startsWith("http") ? `mailto:${part}` : part;
    return (
      <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="break-all font-semibold underline">
        {part}
      </a>
    );
  });
}

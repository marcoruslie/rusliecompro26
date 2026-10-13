"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Send, X } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useLanguage } from "@/lib/i18n";
import type { Lang } from "@/lib/translations";

const COPY: Record<
  Lang,
  { title: string; hint: string; placeholder: string; greeting: string; error: string; launcher: string }
> = {
  en: {
    title: "Ask about price & availability",
    hint: "AI assistant · final quotes via WhatsApp",
    placeholder: "e.g. price for a stainless compression spring?",
    greeting: "Hi! Ask me about pricing or availability of our springs.",
    error: "Sorry, something went wrong. Please try again or contact us on WhatsApp.",
    launcher: "Live chat",
  },
  id: {
    title: "Tanya harga & ketersediaan",
    hint: "Asisten AI · penawaran final via WhatsApp",
    placeholder: "mis. harga pegas tekan stainless?",
    greeting: "Halo! Tanyakan harga atau ketersediaan pegas kami.",
    error: "Maaf, terjadi kesalahan. Silakan coba lagi atau hubungi kami via WhatsApp.",
    launcher: "Chat langsung",
  },
  zh: {
    title: "咨询价格与供货",
    hint: "AI 助手 · 正式报价请通过 WhatsApp",
    placeholder: "例如：不锈钢压缩弹簧多少钱？",
    greeting: "您好！欢迎咨询我们弹簧的价格或供货情况。",
    error: "抱歉，出现错误。请重试或通过 WhatsApp 联系我们。",
    launcher: "在线咨询",
  },
};

export default function ChatWidget() {
  const { lang } = useLanguage();
  const copy = COPY[lang];
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

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
              <div>
                <p className="text-[0.92rem] font-semibold">{copy.title}</p>
                <p className="text-[0.72rem] text-white/60">{copy.hint}</p>
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

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : copy.title}
        aria-expanded={open}
        className={`ml-auto flex h-14 items-center justify-center gap-2 rounded-full bg-navy text-white shadow-plate-lift transition-transform hover:scale-105 ${
          open ? "w-14" : "px-5"
        }`}
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
            </span>
            <MessageCircle className="h-5 w-5" />
            <span className="text-[0.88rem] font-semibold">{copy.launcher}</span>
          </>
        )}
      </button>
    </div>
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

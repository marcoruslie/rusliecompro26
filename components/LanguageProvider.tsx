"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  content,
  DEFAULT_LANG,
  LANG_STORAGE_KEY,
  type Content,
  type Lang,
} from "@/lib/i18n";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  tr: Content;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isLang(value: string | null): value is Lang {
  return value === "en" || value === "id" || value === "zh";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Always start at DEFAULT_LANG so server and first client paint match
  // (no hydration mismatch). The saved choice is applied after mount.
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (isLang(saved)) setLangState(saved);
  }, []);

  const setLang = (next: Lang) => {
    setLangState(next);
    localStorage.setItem(LANG_STORAGE_KEY, next);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, tr: content[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}

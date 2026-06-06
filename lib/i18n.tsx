"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { translations, type Lang, type Dict } from "./translations";

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dict;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  initialLang = "en",
  children,
}: {
  initialLang?: Lang;
  children: ReactNode;
}) {
  // The active language is owned by the route (/en, /id, /zh). The server
  // renders the correct language directly from `initialLang`.
  const [lang, setLangState] = useState<Lang>(initialLang);

  // Keep state in sync if the locale prop changes (client navigation).
  useEffect(() => {
    setLangState(initialLang);
  }, [initialLang]);

  // Reflect the active language on <html lang> for assistive tech / browsers.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang: setLangState, t: translations[lang] }}>
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

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "id", label: "ID" },
  { code: "zh", label: "中文" },
];

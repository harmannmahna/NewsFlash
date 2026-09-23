"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Language = "en" | "hi" | "mr";
type Theme = "light" | "dark";
type SettingsValue = { theme: Theme; language: Language; setTheme: (theme: Theme) => void; setLanguage: (language: Language) => void };
const SettingsContext = createContext<SettingsValue | null>(null);

export const copy = {
  en: { news: "News Articles", live: "Live", chatbot: "Chatbot", preferences: "Preferences", latest: "Latest news", search: "Search headlines and summaries", refresh: "Refresh data", readMore: "Read more", signIn: "Sign in", signUp: "Create account" },
  hi: { news: "समाचार", live: "लाइव", chatbot: "चैटबॉट", preferences: "प्राथमिकताएँ", latest: "ताज़ा खबरें", search: "समाचार खोजें", refresh: "खबरें अपडेट करें", readMore: "और पढ़ें", signIn: "साइन इन", signUp: "खाता बनाएँ" },
  mr: { news: "बातम्या", live: "थेट", chatbot: "चॅटबॉट", preferences: "प्राधान्ये", latest: "ताज्या बातम्या", search: "बातम्या शोधा", refresh: "बातम्या अद्ययावत करा", readMore: "पुढे वाचा", signIn: "साइन इन", signUp: "खाते तयार करा" },
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const savedTheme = localStorage.getItem("newsflash-theme") as Theme | null;
    const initialTheme = savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setThemeState(initialTheme);
    setLanguage((localStorage.getItem("newsflash-language") as Language) || "en");
  }, []);

  useEffect(() => { document.documentElement.dataset.theme = theme; document.documentElement.lang = language; }, [theme, language]);
  const value = useMemo(() => ({
    theme,
    language,
    setTheme: (next: Theme) => { localStorage.setItem("newsflash-theme", next); setThemeState(next); },
    setLanguage: (next: Language) => { localStorage.setItem("newsflash-language", next); setLanguage(next); },
  }), [theme, language]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useSettings must be used inside SettingsProvider");
  return value;
}

"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Language = "es" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("es");

  useEffect(() => {
    // Load saved language preference
    const savedLang = localStorage.getItem("language") as Language | null;
    if (savedLang && (savedLang === "es" || savedLang === "en")) {
      setLanguageState(savedLang);
      document.documentElement.lang = savedLang;
    }

    // Listen for language changes from switcher
    const handleLanguageChange = (e: CustomEvent) => {
      setLanguageState(e.detail);
    };

    window.addEventListener("languageChanged", handleLanguageChange as EventListener);

    return () => {
      window.removeEventListener("languageChanged", handleLanguageChange as EventListener);
    };
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
    document.documentElement.lang = lang;
    window.dispatchEvent(new CustomEvent("languageChanged", { detail: lang }));
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}


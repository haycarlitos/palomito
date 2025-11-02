"use client";

import { Globe } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    const newLang = language === "es" ? "en" : "es";
    setLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-amber-100/50 transition-colors border border-amber-200/50 bg-white/50 backdrop-blur-sm"
      aria-label={`Switch to ${language === "es" ? "English" : "Español"}`}
    >
      <Globe className="w-4 h-4 text-stone-700" />
      <span className="text-sm font-medium text-stone-700 uppercase">
        {language === "es" ? "ES" : "EN"}
      </span>
    </button>
  );
}


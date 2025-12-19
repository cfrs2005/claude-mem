import React, { createContext, useContext, useState, useEffect } from 'react';
import enMessages from '../locales/en.json';
import zhMessages from '../locales/zh.json';

type Language = 'en' | 'zh';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultValue?: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const messages: Record<Language, typeof enMessages> = {
  en: enMessages,
  zh: zhMessages,
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    // Check localStorage for saved language preference
    const savedLang = localStorage.getItem('claude-mem-language') as Language | null;
    if (savedLang && (savedLang === 'en' || savedLang === 'zh')) {
      return savedLang;
    }

    // Check browser language
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'zh') {
      return 'zh';
    }

    return 'en';
  });

  // Save language preference to localStorage
  useEffect(() => {
    localStorage.setItem('claude-mem-language', language);
  }, [language]);

  const t = (keyPath: string, defaultValue: string = keyPath): string => {
    try {
      const keys = keyPath.split('.');
      let value: any = messages[language];

      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          return defaultValue;
        }
      }

      return typeof value === 'string' ? value : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const value: I18nContextType = {
    language,
    setLanguage,
    t,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};

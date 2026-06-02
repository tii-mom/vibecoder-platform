import { create } from 'zustand';
import { Language, TranslationSchema } from './types';
import { en } from './locales/en';
import { zh } from './locales/zh';
import { ko } from './locales/ko';

const localeMap: Record<Language, TranslationSchema> = {
  en,
  zh,
  ko,
};

function getValueByPath(obj: any, path: string): string {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      return path;
    }
    current = current[part];
  }
  return typeof current === 'string' ? current : path;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return Object.entries(params).reduce((acc, [key, val]) => {
    return acc.replace(new RegExp(`{${key}}`, 'g'), escapeHtml(String(val)));
  }, template);
}

function detectLanguage(): Language {
  if (typeof window === 'undefined') return 'en';

  // 1. Check local storage
  const saved = localStorage.getItem('vibecoder_language') as Language | null;
  if (saved && (saved === 'en' || saved === 'zh' || saved === 'ko')) {
    return saved;
  }

  // 2. Check Telegram WebApp init data
  const tg = (window as any).Telegram?.WebApp;
  const tgLang = tg?.initDataUnsafe?.user?.language_code;
  if (tgLang) {
    if (tgLang.startsWith('zh')) return 'zh';
    if (tgLang.startsWith('ko')) return 'ko';
  }

  // 3. Check browser language
  const navLang = navigator.language;
  if (navLang) {
    if (navLang.startsWith('zh')) return 'zh';
    if (navLang.startsWith('ko')) return 'ko';
  }

  return 'en';
}

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const useI18nStore = create<I18nState>((set, get) => ({
  language: detectLanguage(),
  setLanguage: (lang: Language) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vibecoder_language', lang);
    }
    set({ language: lang });
  },
  t: (key: string, params?: Record<string, string | number>) => {
    const lang = get().language;
    const locale = localeMap[lang] || en;
    const template = getValueByPath(locale, key);
    return interpolate(template, params);
  },
}));

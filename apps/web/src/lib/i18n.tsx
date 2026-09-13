import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en, type TranslationKey } from '../locales/en';

export type Dictionary = Partial<Record<TranslationKey, string>>;

export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', dir: 'ltr' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', dir: 'ltr' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം', dir: 'ltr' },
  { code: 'fr', label: 'French', native: 'Français', dir: 'ltr' },
  { code: 'ar', label: 'Arabic', native: 'العربية', dir: 'rtl' },
  { code: 'ne', label: 'Nepali', native: 'नेपाली', dir: 'ltr' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

const loaders: Record<Exclude<LanguageCode, 'en'>, () => Promise<{ default: Dictionary }>> = {
  hi: () => import('../locales/hi'),
  ml: () => import('../locales/ml'),
  fr: () => import('../locales/fr'),
  ar: () => import('../locales/ar'),
  ne: () => import('../locales/ne'),
};

const STORAGE_KEY = 'pdn.lang';

function readLang(): LanguageCode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LANGUAGES.some((l) => l.code === saved)) return saved as LanguageCode;
  } catch {
    /* ignore */
  }
  return 'en';
}

type Vars = Record<string, string | number>;

interface I18nContextValue {
  lang: LanguageCode;
  dir: 'ltr' | 'rtl';
  setLang: (lang: LanguageCode) => void;
  t: (key: TranslationKey, vars?: Vars) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>(readLang);
  const [dict, setDict] = useState<Dictionary>(en);

  useEffect(() => {
    let alive = true;
    if (lang === 'en') setDict(en);
    else
      loaders[lang]()
        .then((mod) => alive && setDict(mod.default))
        .catch(() => alive && setDict(en));
    const dir = LANGUAGES.find((l) => l.code === lang)?.dir ?? 'ltr';
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    return () => {
      alive = false;
    };
  }, [lang]);

  const setLang = useCallback((next: LanguageCode) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Vars) => {
      let text = dict[key] ?? en[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) text = text.split(`{{${k}}}`).join(String(v));
      return text;
    },
    [dict],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ lang, dir: LANGUAGES.find((l) => l.code === lang)?.dir ?? 'ltr', setLang, t }),
    [lang, setLang, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}

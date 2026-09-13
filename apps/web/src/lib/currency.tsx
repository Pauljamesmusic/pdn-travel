import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { formatPrice } from './format';
import { useI18n } from './i18n';

/** Site-wide display currencies. USD is the default; INR, AED and NPR cover PDN's main markets. */
export const CURRENCIES = [
  { code: 'USD', label: 'US Dollar' },
  { code: 'INR', label: 'Indian Rupee' },
  { code: 'AED', label: 'UAE Dirham' },
  { code: 'NPR', label: 'Nepali Rupee' },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]['code'];

const STORAGE_KEY = 'pdn.currency';

/**
 * Reference rates as units of currency per 1 US dollar. Every trip price is stored in USD
 * (see Trip.currency in the schema), so amounts are converted from there for display only —
 * nothing sent to the API (filters, enquiries, admin) is ever changed by this.
 * AED is a long-standing fixed peg; INR and NPR are indicative approximations, not live market
 * rates — update them here if a live feed is ever wired in.
 */
const RATE_PER_USD: Record<CurrencyCode, number> = {
  USD: 1,
  INR: 87,
  AED: 3.6725,
  NPR: 133,
};

const isCurrencyCode = (value: string): value is CurrencyCode => CURRENCIES.some((c) => c.code === value);

export function convertPrice(amount: number, from: string, to: CurrencyCode): number {
  const fromRate = isCurrencyCode(from) ? RATE_PER_USD[from] : 1;
  return (amount / fromRate) * RATE_PER_USD[to];
}

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function readCurrency(): CurrencyCode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && isCurrencyCode(saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  return 'USD';
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(readCurrency);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ currency, setCurrency }), [currency, setCurrency]);
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used inside CurrencyProvider');
  return ctx;
}

/** Returns a `(amount, storedCurrency) => "formatted"` function bound to the visitor's chosen display currency. */
export function useDisplayPrice() {
  const { currency } = useCurrency();
  const { lang } = useI18n();
  return useCallback(
    (amount: number | null | undefined, storedCurrency: string = 'USD') => {
      if (amount == null || Number.isNaN(amount)) return '';
      return formatPrice(convertPrice(amount, storedCurrency, currency), currency, lang);
    },
    [currency, lang],
  );
}

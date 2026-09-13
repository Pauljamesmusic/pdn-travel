const LOCALES: Record<string, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  ml: 'ml-IN',
  fr: 'fr-FR',
  ar: 'ar-AE',
  ne: 'ne-NP',
};

export const localeFor = (lang: string) => LOCALES[lang] ?? 'en-US';

export function formatPrice(amount: number | null | undefined, currency = 'USD', lang = 'en') {
  if (amount == null || Number.isNaN(amount)) return '';
  try {
    return new Intl.NumberFormat(localeFor(lang), {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
      numberingSystem: 'latn',
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function formatDate(iso: string | Date, lang = 'en', options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(localeFor(lang), { ...options, numberingSystem: 'latn' }).format(date);
}

export function formatNumber(value: number, lang = 'en') {
  return new Intl.NumberFormat(localeFor(lang), { numberingSystem: 'latn' }).format(value);
}

/** Only allow links we are happy to render: site paths, https, mailto and tel. */
export function safeHref(href: string | undefined | null): string | undefined {
  if (!href) return undefined;
  const value = href.trim();
  if (/^(\/(?!\/)|#|https:\/\/|mailto:|tel:)/i.test(value)) return value;
  return undefined;
}

export function isExternal(href: string) {
  return /^https?:\/\//i.test(href);
}

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function waLink(number: string, message?: string) {
  const digits = number.replace(/\D/g, '');
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

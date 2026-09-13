import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBodyLock, useFocusTrap } from '../../lib/hooks';
import { useI18n } from '../../lib/i18n';

const SESSION_KEY = 'pdn.welcomeShown';
const SHOW_DELAY_MS = 600;

/** A one-time welcome poster shown over the home page, once per browser session. */
export function WelcomeModal() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useBodyLock(open);
  useFocusTrap(ref, open, () => setOpen(false));

  useEffect(() => {
    let shown = true;
    try {
      shown = sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      /* storage unavailable — fall back to showing once per page load */
    }
    if (shown) return;
    const id = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(id);
  }, []);

  const close = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-ink-950/70 p-4 backdrop-blur-sm animate-fade-up" onMouseDown={close}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to PDN Travel"
        onMouseDown={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm"
      >
        <button
          type="button"
          onClick={close}
          aria-label={t('common.close')}
          className="absolute -top-4 -end-4 z-10 flex size-11 items-center justify-center rounded-full bg-ink-0 text-ink-950 shadow-lg transition-transform hover:scale-105"
        >
          <X size={20} aria-hidden="true" />
        </button>
        <img
          src="/media/pdn-welcome.jpg"
          alt="Welcome to PDN Travels — Atithi Devo Bhava"
          className="max-h-[85vh] w-full rounded-lg object-cover shadow-lg"
        />
      </div>
    </div>,
    document.body,
  );
}

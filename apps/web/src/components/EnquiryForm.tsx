import { CheckCircle2 } from 'lucide-react';
import { type FormEvent, useId, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { cx, formatDate } from '../lib/format';
import { useI18n } from '../lib/i18n';
import type { TranslationKey } from '../locales/en';
import { Button } from './ui';

interface Values {
  name: string;
  email: string;
  phone: string;
  travellers: string;
  preferredDate: string;
  tripId: string;
  message: string;
  website: string;
}

type Errors = Partial<Record<keyof Values, TranslationKey>>;

function validate(values: Values): Errors {
  const errors: Errors = {};
  if (values.name.trim().length < 2) errors.name = 'contact.required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim())) errors.email = 'contact.invalidEmail';
  if (values.phone && !/^[+\d\s().-]{6,40}$/.test(values.phone)) errors.phone = 'contact.required';
  if (values.message.trim().length < 5) errors.message = 'contact.shortMessage';
  return errors;
}

export function EnquiryForm({
  trips = [],
  defaultTripId,
  defaultDate,
  defaultTravellers,
  defaultMessage = '',
  source = 'contact-page',
  compact = false,
}: {
  trips?: { id: number; title: string }[];
  defaultTripId?: number;
  defaultDate?: string;
  defaultTravellers?: number;
  defaultMessage?: string;
  source?: string;
  compact?: boolean;
}) {
  const { t, lang } = useI18n();
  const id = useId();
  const [values, setValues] = useState<Values>({
    name: '',
    email: '',
    phone: '',
    travellers: String(defaultTravellers ?? 2),
    preferredDate: defaultDate ?? '',
    tripId: defaultTripId ? String(defaultTripId) : '',
    message: defaultMessage,
    website: '',
  });
  const [touched, setTouched] = useState<Partial<Record<keyof Values, boolean>>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');
  const [serverError, setServerError] = useState('');
  const [reference, setReference] = useState<string | null>(null);
  const errors = validate(values);

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 18 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      return formatDate(d, 'en', { month: 'long', year: 'numeric' });
    });
  }, []);

  const set = (key: keyof Values) => (event: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: event.target.value }));
  const blur = (key: keyof Values) => () => setTouched((tch) => ({ ...tch, [key]: true }));
  const showError = (key: keyof Values) => (touched[key] ? errors[key] : undefined);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched({ name: true, email: true, phone: true, message: true });
    if (Object.keys(errors).length) {
      document.getElementById(`${id}-${Object.keys(errors)[0]}`)?.focus();
      return;
    }
    setStatus('sending');
    setServerError('');
    try {
      const res = await api<{ reference: string }>('/enquiries', {
        method: 'POST',
        json: {
          name: values.name,
          email: values.email,
          phone: values.phone || undefined,
          travellers: Number(values.travellers) || undefined,
          preferredDate: values.preferredDate || undefined,
          tripId: values.tripId ? Number(values.tripId) : undefined,
          message: values.message,
          website: values.website || undefined,
          source,
        },
      });
      setReference(res.reference);
      setStatus('idle');
    } catch (err) {
      setServerError((err as Error).message);
      setStatus('error');
    }
  };

  if (reference) {
    return (
      <div role="status" className="flex flex-col items-center gap-4 rounded-lg border border-line bg-accent-subtle px-6 py-12 text-center">
        <CheckCircle2 size={48} className="text-fg-accent" aria-hidden="true" />
        <h3 className="text-h3 text-fg">{t('contact.successTitle')}</h3>
        <p className="max-w-md text-body-m text-fg-muted">{t('contact.successBody', { ref: reference })}</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setReference(null);
            setValues((v) => ({ ...v, message: '' }));
            setTouched({});
          }}
        >
          {t('contact.another')}
        </Button>
      </div>
    );
  }

  const inputClass = (key: keyof Values) =>
    cx(
      'min-h-[52px] w-full rounded-md border bg-surface px-4 text-body-m text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-fg',
      showError(key) ? 'border-red-500' : 'border-line',
    );

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {/* Honeypot — hidden from people and screen readers */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={values.website} onChange={set('website')} />
        </label>
      </div>

      <div className={cx('grid gap-5', !compact && 'sm:grid-cols-2')}>
        <FieldWrap id={`${id}-name`} label={t('contact.name')} error={showError('name') && t(showError('name')!)} required>
          <input id={`${id}-name`} className={inputClass('name')} value={values.name} onChange={set('name')} onBlur={blur('name')} autoComplete="name" aria-invalid={!!showError('name')} aria-describedby={`${id}-name-error`} required />
        </FieldWrap>
        <FieldWrap id={`${id}-email`} label={t('contact.email')} error={showError('email') && t(showError('email')!)} required>
          <input id={`${id}-email`} type="email" inputMode="email" className={inputClass('email')} value={values.email} onChange={set('email')} onBlur={blur('email')} autoComplete="email" aria-invalid={!!showError('email')} aria-describedby={`${id}-email-error`} required />
        </FieldWrap>
        <FieldWrap id={`${id}-phone`} label={t('contact.phone')} error={showError('phone') && t('contact.required')}>
          <input id={`${id}-phone`} type="tel" inputMode="tel" dir="ltr" placeholder="+977 98…" className={inputClass('phone')} value={values.phone} onChange={set('phone')} onBlur={blur('phone')} autoComplete="tel" aria-invalid={!!showError('phone')} aria-describedby={`${id}-phone-error`} />
        </FieldWrap>
        <FieldWrap id={`${id}-travellers`} label={t('contact.travellers')}>
          <select id={`${id}-travellers`} className={inputClass('travellers')} value={values.travellers} onChange={set('travellers')}>
            {Array.from({ length: 20 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </FieldWrap>
        <FieldWrap id={`${id}-date`} label={t('contact.preferredDate')}>
          <select id={`${id}-date`} className={inputClass('preferredDate')} value={values.preferredDate} onChange={set('preferredDate')}>
            <option value="">{t('filters.any')}</option>
            {defaultDate && !months.includes(defaultDate) && <option value={defaultDate}>{defaultDate}</option>}
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </FieldWrap>
        {trips.length > 0 && (
          <FieldWrap id={`${id}-trip`} label={t('contact.trip')}>
            <select id={`${id}-trip`} className={inputClass('tripId')} value={values.tripId} onChange={set('tripId')}>
              <option value="">{t('contact.anyTrip')}</option>
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.title}
                </option>
              ))}
            </select>
          </FieldWrap>
        )}
      </div>

      <FieldWrap id={`${id}-message`} label={t('contact.message')} error={showError('message') && t(showError('message')!)} required>
        <textarea id={`${id}-message`} rows={compact ? 4 : 5} className={cx(inputClass('message'), 'resize-y py-3')} value={values.message} onChange={set('message')} onBlur={blur('message')} aria-invalid={!!showError('message')} aria-describedby={`${id}-message-error`} maxLength={3000} required />
      </FieldWrap>

      {serverError && (
        <p role="alert" className="rounded-md bg-brand-subtle px-4 py-3 text-body-s text-fg-brand">
          {serverError}
        </p>
      )}

      <Button type="submit" icon loading={status === 'sending'} className="w-full sm:w-auto sm:self-start">
        {status === 'sending' ? t('contact.sending') : t('contact.send')}
      </Button>
      <p className="text-meta text-fg-subtle" lang={lang}>
        {t('trip.noCharge')}
      </p>
    </form>
  );
}

function FieldWrap({ id, label, error, required, children }: { id: string; label: string; error?: string | false; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-label text-fg">
        {label}
        {required && (
          <span className="text-fg-brand" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      <p id={`${id}-error`} role={error ? 'alert' : undefined} className="min-h-0 text-meta text-red-600 dark:text-red-400">
        {error || ''}
      </p>
    </div>
  );
}

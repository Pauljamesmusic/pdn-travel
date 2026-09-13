import { ArrowRight, Calendar, ChevronDown, Compass, Gauge, Headset, MapPin, Mountain, Sailboat, Search, Users } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, type ReactNode, useId, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { qs, useApi } from '../../lib/api';
import { cx, formatDate } from '../../lib/format';
import { useI18n } from '../../lib/i18n';
import type { Filters } from '../../lib/types';

type Tab = 'destination' | 'tour' | 'activity';

const DURATIONS = [
  { value: '', min: undefined, max: undefined, key: 'search.anyDuration' },
  { value: 'short', min: 1, max: 5, key: 'filters.shortTrips' },
  { value: 'mid', min: 6, max: 10, key: 'filters.midTrips' },
  { value: 'long', min: 11, max: undefined, key: 'filters.longTrips' },
] as const;

/** Figma “Search card”: Destination / Tour / Activity tabs with their own fields. */
export function HeroSearchCard() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { data: filters } = useApi<Filters>('/filters', { ttl: 5 * 60_000 });
  const [tab, setTab] = useState<Tab>('destination');
  const [country, setCountry] = useState('');
  const [month, setMonth] = useState('');
  const [travellers, setTravellers] = useState('2');
  const [duration, setDuration] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [activity, setActivity] = useState('');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const idBase = useId();

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      return { value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: formatDate(d, lang, { month: 'long', year: 'numeric' }) };
    });
  }, [lang]);

  const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'destination', label: t('search.tabDestination'), icon: <MapPin size={18} aria-hidden="true" /> },
    { id: 'tour', label: t('search.tabTour'), icon: <Compass size={18} aria-hidden="true" /> },
    { id: 'activity', label: t('search.tabActivity'), icon: <Sailboat size={18} aria-hidden="true" /> },
  ];

  const onTabKey = (event: KeyboardEvent, index: number) => {
    const rtl = document.documentElement.dir === 'rtl';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const back = rtl ? 'ArrowRight' : 'ArrowLeft';
    let next = index;
    if (event.key === forward) next = (index + 1) % tabs.length;
    else if (event.key === back) next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    setTab(tabs[next].id);
    tabRefs.current[next]?.focus();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const range = DURATIONS.find((d) => d.value === duration);
    const params =
      tab === 'destination'
        ? { country, month, travellers }
        : tab === 'tour'
          ? { minDays: range?.min, maxDays: range?.max, difficulty, travellers }
          : { activity, month };
    navigate(`/tours${qs(params)}`);
  };

  const countryName = filters?.continents.flatMap((c) => c.countries).find((c) => c.slug === country)?.name;
  const activityName = filters?.activities.find((a) => a.slug === activity)?.name;
  const monthLabel = months.find((m) => m.value === month)?.label;
  const durationLabel = t(DURATIONS.find((d) => d.value === duration)?.key ?? 'search.anyDuration');

  return (
    <form onSubmit={submit} className="relative z-10 flex flex-col gap-3 rounded-[24px] bg-surface p-3 shadow-lg lg:gap-5 lg:rounded-[28px] lg:p-5 dark:border dark:border-line">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label={t('search.submitLong')} className="flex gap-1 rounded-full bg-subtle p-1 lg:gap-2">
          {tabs.map((item, i) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`${idBase}-tab-${item.id}`}
                aria-selected={active}
                aria-controls={`${idBase}-panel`}
                tabIndex={active ? 0 : -1}
                onClick={() => setTab(item.id)}
                onKeyDown={(e) => onTabKey(e, i)}
                className={cx(
                  'flex min-h-11 items-center justify-center gap-1 rounded-full text-meta font-semibold transition-colors duration-200 max-lg:flex-1 max-lg:px-3 lg:min-h-16 lg:gap-2.5 lg:py-3.5 lg:pe-6 lg:ps-5 lg:text-label',
                  active ? 'bg-inverse text-fg-inverse' : 'text-fg hover:bg-muted lg:border lg:border-red-600/80 lg:text-fg-muted',
                )}
              >
                <span
                  className={cx(
                    'hidden size-9 items-center justify-center rounded-full lg:flex',
                    active ? 'bg-brand text-ink-0' : 'bg-muted text-fg',
                  )}
                >
                  {item.icon}
                </span>
                <span className="lg:hidden">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </div>
        <Link to="/contact" className="group hidden items-center gap-2 text-label text-fg-brand lg:inline-flex">
          <Headset size={18} aria-hidden="true" />
          {t('search.talkToExpert')}
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1 rtl:-scale-x-100" aria-hidden="true" />
        </Link>
      </div>

      <div
        id={`${idBase}-panel`}
        role="tabpanel"
        aria-labelledby={`${idBase}-tab-${tab}`}
        className="flex flex-col overflow-hidden rounded-[18px] bg-subtle lg:flex-row lg:items-center lg:rounded-[22px] lg:p-2"
      >
        {tab === 'destination' && (
          <>
            <Field icon={<MapPin size={20} />} label={t('search.whereTo')} value={countryName ?? t('search.destinationHint')} placeholder={!countryName}>
              <select value={country} onChange={(e) => setCountry(e.target.value)} aria-label={t('search.whereTo')}>
                <option value="">{t('search.destinationHint')}</option>
                {filters?.continents.map((c) => (
                  <optgroup key={c.slug} label={c.name}>
                    {c.countries.map((country) => (
                      <option key={country.slug} value={country.slug}>
                        {country.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>
            <Divider />
            <MonthField months={months} month={month} setMonth={setMonth} label={monthLabel} />
            <Divider />
            <TravellersField value={travellers} onChange={setTravellers} />
          </>
        )}
        {tab === 'tour' && (
          <>
            <Field icon={<Gauge size={20} />} label={t('search.duration')} value={durationLabel} placeholder={!duration}>
              <select value={duration} onChange={(e) => setDuration(e.target.value)} aria-label={t('search.duration')}>
                {DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {t(d.key)}
                  </option>
                ))}
              </select>
            </Field>
            <Divider />
            <Field icon={<Mountain size={20} />} label={t('search.tourStyle')} value={difficulty || t('search.anyStyle')} placeholder={!difficulty}>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} aria-label={t('search.tourStyle')}>
                <option value="">{t('search.anyStyle')}</option>
                {(filters?.difficulties ?? ['Easy', 'Moderate', 'Challenging', 'Strenuous']).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <Divider />
            <TravellersField value={travellers} onChange={setTravellers} />
          </>
        )}
        {tab === 'activity' && (
          <>
            <Field icon={<Sailboat size={20} />} label={t('search.activity')} value={activityName ?? t('search.activityHint')} placeholder={!activityName}>
              <select value={activity} onChange={(e) => setActivity(e.target.value)} aria-label={t('search.activity')}>
                <option value="">{t('search.activityHint')}</option>
                {filters?.activities.map((a) => (
                  <option key={a.slug} value={a.slug}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            <Divider />
            <MonthField months={months} month={month} setMonth={setMonth} label={monthLabel} />
          </>
        )}

        <div className="p-3 lg:p-0 lg:ps-2">
          <button
            type="submit"
            className="flex h-14 w-full items-center justify-center gap-2.5 rounded-md bg-brand px-8 text-label text-ink-0 transition-colors hover:bg-red-700 lg:h-16 lg:w-auto"
          >
            <Search size={20} aria-hidden="true" />
            <span className="lg:hidden">{t('search.submitLong')}</span>
            <span className="hidden lg:inline">{t('search.submit')}</span>
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({ icon, label, value, placeholder, children }: { icon: ReactNode; label: string; value: string; placeholder?: boolean; children: ReactNode }) {
  return (
    <label className="group relative flex min-w-0 flex-1 cursor-pointer items-center gap-3.5 border-b border-line px-4 py-3 last-of-type:border-b-0 lg:border-0 lg:py-2.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-fg lg:size-11" aria-hidden="true">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-caps text-fg-subtle">{label}</span>
        <span className={cx('truncate text-body-m', placeholder ? 'text-fg-subtle' : 'text-fg')}>{value}</span>
      </span>
      <ChevronDown size={18} className="shrink-0 text-fg-muted transition-transform group-focus-within:rotate-180" aria-hidden="true" />
      {/* Native select sits over the field: accessible, keyboard friendly and uses the phone’s picker on mobile. */}
      <span className="absolute inset-0 [&>select]:size-full [&>select]:cursor-pointer [&>select]:opacity-0">{children}</span>
    </label>
  );
}

function Divider() {
  return <span className="hidden h-10 w-px shrink-0 bg-line-strong lg:block" aria-hidden="true" />;
}

function MonthField({ months, month, setMonth, label }: { months: { value: string; label: string }[]; month: string; setMonth: (v: string) => void; label?: string }) {
  const { t } = useI18n();
  return (
    <Field icon={<Calendar size={20} />} label={t('search.when')} value={label ?? t('search.addDates')} placeholder={!label}>
      <select value={month} onChange={(e) => setMonth(e.target.value)} aria-label={t('search.when')}>
        <option value="">{t('search.addDates')}</option>
        {months.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

function TravellersField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  return (
    <Field icon={<Users size={20} />} label={t('search.travellers')} value={t('search.travellersValue', { count: value })}>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={t('search.travellers')}>
        {Array.from({ length: 16 }, (_, i) => String(i + 1)).map((n) => (
          <option key={n} value={n}>
            {t('search.travellersValue', { count: n })}
          </option>
        ))}
      </select>
    </Field>
  );
}

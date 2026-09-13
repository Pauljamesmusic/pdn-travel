import { Building2, Calendar, MapPin, Quote, ShieldCheck, UserRound } from 'lucide-react';
import { formatDate, safeHref } from '../lib/format';
import { useI18n } from '../lib/i18n';
import type { PageBlock } from '../lib/types';
import { Icon } from './Icon';
import { ButtonLink, RichText, SmartImage } from './ui';

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const arr = <T,>(v: unknown) => (Array.isArray(v) ? (v as T[]) : []);

/** Renders CMS page blocks. Every block type here is editable from Admin → Pages. */
export function BlockRenderer({ blocks }: { blocks: PageBlock[] }) {
  return (
    <div className="flex flex-col gap-16 lg:gap-24">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}

function Heading({ eyebrow, heading, intro }: { eyebrow?: string; heading?: string; intro?: string }) {
  if (!eyebrow && !heading && !intro) return null;
  return (
    <div className="flex max-w-2xl flex-col gap-3">
      {eyebrow && <p className="text-caps text-fg-accent">{eyebrow}</p>}
      {heading && <h2 className="text-h1 text-fg">{heading}</h2>}
      {intro && <p className="text-body-m text-fg-muted">{intro}</p>}
    </div>
  );
}

function Block({ block }: { block: PageBlock }) {
  const { lang } = useI18n();
  switch (block.type) {
    case 'richText':
      return (
        <section className="flex max-w-3xl flex-col gap-5">
          <Heading heading={str(block.heading)} />
          <RichText text={str(block.body)} className="text-body-m text-fg-muted" />
        </section>
      );

    case 'imageText': {
      const imageRight = block.imageSide !== 'left';
      return (
        <section className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className={imageRight ? '' : 'lg:order-2'}>
            <Heading eyebrow={str(block.eyebrow)} heading={str(block.heading)} />
            <RichText text={str(block.body)} className="mt-5 text-body-m text-fg-muted" />
          </div>
          <SmartImage src={str(block.image) || undefined} alt={str(block.heading)} className="max-h-[560px] w-full rounded-lg object-cover shadow-md" />
        </section>
      );
    }

    case 'stats':
      return (
        <section>
          <dl className="grid grid-cols-2 gap-6 rounded-lg border border-line bg-subtle p-8 lg:grid-cols-4">
            {arr<{ value: string; label: string }>(block.items).map((item) => (
              <div key={item.label} className="flex flex-col gap-1 border-s-2 border-red-500 ps-4">
                <dt className="order-2 text-meta text-fg-muted">{item.label}</dt>
                <dd className="order-1 font-serif text-[40px] leading-[44px] text-fg">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      );

    case 'cards':
      return (
        <section className="flex flex-col gap-8">
          <Heading heading={str(block.heading)} intro={str(block.intro)} />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {arr<{ icon: string; title: string; body: string }>(block.items).map((item) => (
              <div key={item.title} className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
                <span className="flex size-[52px] items-center justify-center rounded-md bg-brand-subtle text-fg-brand">
                  <Icon name={item.icon} size={24} />
                </span>
                <h3 className="text-h4 text-fg">{item.title}</h3>
                <p className="text-body-s text-fg-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      );

    case 'team':
      return (
        <section className="flex flex-col gap-8">
          <Heading heading={str(block.heading)} intro={str(block.intro)} />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {arr<{ name: string; role: string; bio: string; photo: string }>(block.items).map((person) => (
              <article key={person.name} className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-6 sm:flex-row sm:p-8">
                {person.photo ? (
                  <SmartImage src={person.photo} alt={person.name} className="size-28 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex size-28 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-fg-brand">
                    <UserRound size={44} aria-hidden="true" />
                  </span>
                )}
                <div className="flex flex-col gap-2">
                  <h3 className="text-h3 text-fg">{person.name}</h3>
                  <p className="text-caps text-fg-accent">{person.role}</p>
                  <p className="text-body-s text-fg-muted">{person.bio}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      );

    case 'registrations':
      return (
        <section className="flex flex-col gap-8">
          <Heading heading={str(block.heading)} intro={str(block.intro)} />
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {arr<{ authority: string; label: string; number: string }>(block.items).map((item) => (
              <li key={item.authority + item.number} className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
                <span className="flex size-11 items-center justify-center rounded-md bg-accent-subtle text-fg-accent">
                  <Building2 size={20} aria-hidden="true" />
                </span>
                <p className="text-label text-fg">{item.authority}</p>
                <p className="text-body-s text-fg-muted">{item.label}</p>
                <p className="mt-auto inline-flex items-center gap-2 text-body-s">
                  <ShieldCheck size={16} className="text-fg-accent" aria-hidden="true" />
                  <span className="text-fg-subtle">No.</span>
                  <span className="font-semibold tabular-nums text-fg" dir="ltr">
                    {item.number}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      );

    case 'list':
      return (
        <section className="flex max-w-3xl flex-col gap-6">
          <Heading heading={str(block.heading)} />
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {arr<string>(block.items).map((item) => (
              <li key={item} className="flex gap-3 rounded-md bg-subtle p-4 text-body-s text-fg">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-red-500" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      );

    case 'legal':
      return (
        <section className="max-w-3xl">
          <ol className="flex flex-col gap-8">
            {arr<{ title: string; body: string }>(block.items).map((item, i) => (
              <li key={item.title} className="grid grid-cols-1 gap-3 border-b border-line pb-8 sm:grid-cols-[48px_1fr]">
                <span className="font-serif text-h3 text-fg-brand">{String(i + 1).padStart(2, '0')}</span>
                <div className="flex flex-col gap-2">
                  <h2 className="text-h4 text-fg">{item.title}</h2>
                  <RichText text={item.body} className="text-body-m text-fg-muted" />
                </div>
              </li>
            ))}
          </ol>
        </section>
      );

    case 'faq':
      return (
        <section className="flex max-w-3xl flex-col gap-6">
          <Heading heading={str(block.heading)} />
          <div className="flex flex-col divide-y divide-line rounded-lg border border-line">
            {arr<{ q: string; a: string }>(block.items).map((item) => (
              <details key={item.q} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-label text-fg">
                  {item.q}
                  <span className="text-h3 text-fg-brand transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <RichText text={item.a} className="pt-3 text-body-s text-fg-muted" />
              </details>
            ))}
          </div>
        </section>
      );

    case 'quote':
      return (
        <figure className="relative mx-auto flex max-w-3xl flex-col items-center gap-5 px-4 text-center">
          <Quote size={40} className="text-fg-brand opacity-40 rtl:-scale-x-100" aria-hidden="true" />
          <blockquote className="text-h1 text-fg text-balance">{str(block.text)}</blockquote>
          {str(block.attribution) && <figcaption className="text-caps text-fg-subtle">{str(block.attribution)}</figcaption>}
        </figure>
      );

    case 'events':
      return (
        <section className="flex flex-col gap-8">
          <Heading heading={str(block.heading)} />
          <div className="flex flex-col gap-6">
            {arr<{ title: string; date: string; location: string; body: string; image: string; ctaLabel?: string; ctaLink?: string }>(block.items).map((event) => (
              <article key={event.title} className="grid grid-cols-1 overflow-hidden rounded-lg border border-line bg-surface md:grid-cols-[2fr_3fr]">
                <SmartImage src={event.image || undefined} alt={event.title} className="h-60 w-full object-cover md:h-full" />
                <div className="flex flex-col gap-4 p-6 sm:p-10">
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-label text-fg-brand">
                    {event.date && (
                      <span className="inline-flex items-center gap-2">
                        <Calendar size={16} aria-hidden="true" /> {formatDate(event.date, lang, { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    )}
                    {event.location && (
                      <span className="inline-flex items-center gap-2 text-fg-muted">
                        <MapPin size={16} aria-hidden="true" /> {event.location}
                      </span>
                    )}
                  </div>
                  <h3 className="text-h2 text-fg">{event.title}</h3>
                  <RichText text={event.body} className="text-body-m text-fg-muted" />
                  {event.ctaLabel && safeHref(event.ctaLink) && (
                    <div>
                      <ButtonLink to={event.ctaLink!} icon>
                        {event.ctaLabel}
                      </ButtonLink>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      );

    case 'gallery':
      return (
        <section className="flex flex-col gap-6">
          <Heading heading={str(block.heading)} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {arr<{ url: string; alt: string }>(block.images).map((img, i) => (
              <SmartImage key={img.url + i} src={img.url} alt={img.alt} className="aspect-[4/3] w-full rounded-md object-cover" />
            ))}
          </div>
        </section>
      );

    case 'cta':
      return (
        <section data-theme="dark" className="flex flex-col items-start gap-6 rounded-xl bg-canvas p-8 sm:p-12 lg:flex-row lg:items-center lg:justify-between" style={{ backgroundImage: 'radial-gradient(ellipse 40% 90% at 90% 50%, rgba(236,28,46,0.35), transparent)' }}>
          <div className="flex max-w-xl flex-col gap-3">
            <h2 className="text-h1 text-fg">{str(block.heading)}</h2>
            {str(block.body) && <p className="text-body-m text-fg-muted">{str(block.body)}</p>}
          </div>
          {str(block.buttonLabel) && (
            <ButtonLink to={safeHref(str(block.buttonLink)) ?? '/contact'} icon>
              {str(block.buttonLabel)}
            </ButtonLink>
          )}
        </section>
      );

    default:
      return null;
  }
}

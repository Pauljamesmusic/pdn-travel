import { ArrowRight, Pause, Play, X } from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { cx } from '../../lib/format';
import { useBodyLock, useFocusTrap, usePrefersReducedMotion } from '../../lib/hooks';
import { useI18n } from '../../lib/i18n';
import type { HomeSettings } from '../../lib/types';
import { AccentTitle, Button, ButtonLink } from '../ui';

const SLIDE_MS = 6000;

const DEFAULT_SLIDES: HomeSettings['heroSlides'] = [
  {
    eyebrow: 'Discover new destinations with us',
    titleLead: 'Explore your',
    titleAccent: 'dream',
    titleTail: 'places',
    body: 'From scorching deserts to freezing mountains, steamy rainforests to vibrant cities — uncover the cultures, religions and traditions that make every place extraordinary.',
  },
];

/**
 * Figma “01 Hero + Search / Hero · Stage (Dark mode)”: the animated solar-system film
 * with the copy stack on the left, stats along the bottom and a 3-slide progress indicator.
 */
export function Hero({ home }: { home: HomeSettings | undefined }) {
  const { t } = useI18n();
  const reducedMotion = usePrefersReducedMotion();
  const slides = home?.heroSlides?.length ? home.heroSlides : DEFAULT_SLIDES;
  const stats = home?.stats ?? [];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(!reducedMotion);
  const [filmOpen, setFilmOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (paused || reducedMotion || slides.length < 2) return;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % slides.length), SLIDE_MS);
    return () => window.clearTimeout(id);
  }, [index, paused, reducedMotion, slides.length]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (videoPlaying && !reducedMotion) void video.play().catch(() => setVideoPlaying(false));
    else video.pause();
  }, [videoPlaying, reducedMotion]);

  const slide = slides[Math.min(index, slides.length - 1)];

  return (
    <section
      data-theme="dark"
      className="relative isolate overflow-hidden bg-canvas pb-40 pt-28 sm:pt-32 lg:min-h-[920px] lg:pb-44 lg:pt-44"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      {/* Stage */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <img src="/media/hero-mobile.jpg" alt="" className="size-full object-cover object-bottom lg:hidden" />
        <video
          ref={videoRef}
          className="hidden size-full object-cover lg:block"
          src="/media/solar-system.mp4"
          poster="/media/hero-poster.jpg"
          autoPlay={!reducedMotion}
          muted
          loop
          playsInline
          preload="metadata"
        />
        <div className="absolute inset-0 bg-black/45 lg:hidden" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,11,11,0.7)_0%,rgba(11,11,11,0.1)_15%,rgba(11,11,11,0.55)_45%,rgba(11,11,11,0.95)_100%)] lg:bg-[linear-gradient(180deg,rgba(11,11,11,0.6)_0%,rgba(11,11,11,0)_18%,rgba(11,11,11,0)_70%,rgba(11,11,11,0.9)_100%)]" />
        <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(11,11,11,0.88)_0%,rgba(11,11,11,0.55)_45%,rgba(11,11,11,0)_70%)] lg:block rtl:bg-[linear-gradient(270deg,rgba(11,11,11,0.88)_0%,rgba(11,11,11,0.55)_45%,rgba(11,11,11,0)_70%)]" />
      </div>

      <div className="container-pdn relative">
        <div className="flex max-w-[640px] flex-col items-start gap-5 lg:gap-7" aria-live={paused ? 'polite' : 'off'}>
          {home?.announcement && (
            <Link
              to={home.announcement.link.startsWith('#') ? `/${home.announcement.link}` : home.announcement.link}
              className="group inline-flex max-w-full items-center gap-2.5 rounded-full border border-white/15 bg-white/10 py-1.5 pe-4 ps-1.5 text-body-s text-fg backdrop-blur-md transition-colors hover:bg-white/15 animate-fade-up"
            >
              <span className="rounded-full bg-red-500 px-2.5 py-1 text-caps text-ink-0">{home.announcement.tag}</span>
              <span className="truncate">{home.announcement.text}</span>
              <ArrowRight size={16} className="shrink-0 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
          )}

          <div key={index} className="flex flex-col gap-4">
            {slide.eyebrow && <p className="text-caps text-red-400 animate-fade-up">{slide.eyebrow}</p>}
            <AccentTitle
              as="h1"
              lead={slide.titleLead}
              accent={slide.titleAccent}
              tail={slide.titleTail}
              className="text-display-xl text-fg animate-fade-up [animation-delay:60ms]"
              accentClassName="text-red-500"
            />
          </div>
          <p key={`b${index}`} className="max-w-[540px] text-body-m text-fg-muted animate-fade-up [animation-delay:120ms] sm:text-body-l">
            {slide.body}
          </p>

          <div className="flex w-full flex-col gap-3 animate-fade-up [animation-delay:180ms] sm:w-auto sm:flex-row sm:gap-4">
            <ButtonLink to="/tours" icon>
              {t('hero.startExploring')}
            </ButtonLink>
            <Button variant="glass" onClick={() => setFilmOpen(true)} className="max-sm:hidden">
              <Play size={16} aria-hidden="true" className="fill-current" />
              {t('hero.watchJourney')}
            </Button>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-8 lg:mt-24 lg:flex-row lg:items-end lg:justify-between">
          {stats.length > 0 && (
            <dl className="grid grid-cols-3 gap-4 sm:flex sm:items-center sm:gap-10">
              {stats.map((stat, i) => (
                <Fragment key={stat.label}>
                  {i > 0 && <span className="hidden h-10 w-px bg-white/20 sm:block" aria-hidden="true" />}
                  <div className={cx('flex flex-col gap-0.5', i === 3 && 'max-sm:hidden')}>
                    <dt className="sr-only">{stat.label}</dt>
                    <dd className="font-serif text-2xl leading-[34px] text-fg sm:text-[32px] sm:leading-9">{stat.value}</dd>
                    <dd className="text-meta text-fg-muted" aria-hidden="true">
                      {stat.label}
                    </dd>
                  </div>
                </Fragment>
              ))}
            </dl>
          )}

          {slides.length > 1 && (
            <div className="flex items-center gap-3.5">
              <span className="text-label text-fg">{String(index + 1).padStart(2, '0')}</span>
              <div className="flex items-center gap-2" role="tablist">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-label={t('hero.slide', { n: i + 1 })}
                    onClick={() => setIndex(i)}
                    className="flex h-6 items-center"
                  >
                    <span className={cx('relative block h-[3px] overflow-hidden rounded-[2px] bg-white/30 transition-[width] duration-300', i === index ? 'w-16' : 'w-8')}>
                      {i === index && (
                        <span
                          key={`${index}-${paused}`}
                          className="absolute inset-0 origin-left bg-red-500 rtl:origin-right"
                          style={{ animation: paused || reducedMotion ? 'none' : `progress-fill ${SLIDE_MS}ms linear forwards`, transform: paused || reducedMotion ? 'scaleX(0.6)' : undefined }}
                        />
                      )}
                    </span>
                  </button>
                ))}
              </div>
              <span className="text-label text-fg-muted">{String(slides.length).padStart(2, '0')}</span>
              <button
                type="button"
                onClick={() => setVideoPlaying((v) => !v)}
                aria-label={videoPlaying ? t('hero.pause') : t('hero.play')}
                className="ms-2 flex size-9 items-center justify-center rounded-full border border-white/20 text-fg hover:bg-white/10"
              >
                {videoPlaying ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {filmOpen && createPortal(<FilmModal onClose={() => setFilmOpen(false)} />, document.body)}
    </section>
  );
}

function FilmModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  useBodyLock(true);
  useFocusTrap(ref, true, onClose);
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-950/90 p-4 backdrop-blur-sm" onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={t('hero.watchJourney')} className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label={t('search.close')} className="absolute -top-14 end-0 flex size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
          <X size={20} aria-hidden="true" />
        </button>
        <video src="/media/solar-system.mp4" poster="/media/hero-poster.jpg" controls autoPlay playsInline className="aspect-video w-full rounded-lg bg-black shadow-lg" />
      </div>
    </div>
  );
}

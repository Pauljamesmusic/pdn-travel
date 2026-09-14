import { type RefObject, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

export function useScrolled(threshold = 80) {
  const [scrolled, setScrolled] = useState(() => typeof window !== 'undefined' && window.scrollY > threshold);
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setScrolled(window.scrollY > threshold));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [threshold]);
  return scrolled;
}

/** Adds `is-visible` to `.reveal` children when the container scrolls into view. */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const targets = root.matches('.reveal') ? [root] : Array.from(root.querySelectorAll<HTMLElement>('.reveal'));
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  });
  return ref;
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

export function usePrefersReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Sets title/description plus the canonical link and Open Graph tags every route needs for
 * crawlers and chat-app link previews (WhatsApp, Facebook) that don't execute JS — those only
 * ever see whatever is in the initial HTML `<head>` for the URL they fetch, so this has to run
 * on every route change, not just once. `image` is optional per page (e.g. a trip's cover photo).
 */
export function useDocumentMeta(title?: string, description?: string | null, image?: string | null) {
  const { pathname } = useLocation();
  useEffect(() => {
    const fullTitle = title ? (title.includes('PDN Travel') ? title : `${title} | PDN Travel`) : undefined;
    if (fullTitle) {
      document.title = fullTitle;
      upsertMeta('property', 'og:title', fullTitle);
    }
    if (description) {
      upsertMeta('name', 'description', description);
      upsertMeta('property', 'og:description', description);
    }
    if (image) upsertMeta('property', 'og:image', new URL(image, window.location.origin).href);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:url', window.location.href);
    upsertMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `${window.location.origin}${pathname}`;
  }, [title, description, image, pathname]);
}

export function useCountdown(targetIso: string | undefined) {
  const target = targetIso ? new Date(targetIso).getTime() : NaN;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (Number.isNaN(target)) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [target]);
  const diff = Math.max(0, (Number.isNaN(target) ? 0 : target) - now);
  return {
    done: !Number.isNaN(target) && diff === 0,
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor(diff / 3_600_000) % 24,
    minutes: Math.floor(diff / 60_000) % 60,
    seconds: Math.floor(diff / 1000) % 60,
  };
}

export function useDebounced<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function useBodyLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [locked]);
}

export function useOnClickOutside(ref: RefObject<HTMLElement | null>, handler: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, enabled]);
}

/** Keeps keyboard focus inside a dialog and restores it on close. */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean, onEscape?: () => void) {
  useEffect(() => {
    if (!active) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const focusables = () =>
      Array.from(
        node?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => el.offsetParent !== null);
    window.setTimeout(() => (focusables()[0] ?? node)?.focus(), 30);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [ref, active, onEscape]);
}

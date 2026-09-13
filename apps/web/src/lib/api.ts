import { useCallback, useEffect, useRef, useState } from 'react';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

type ApiInit = Omit<RequestInit, 'body'> & { json?: unknown; body?: BodyInit | null };

export async function api<T>(path: string, init: ApiInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  let body = init.body;
  if (init.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(init.json);
  }
  const res = await fetch(`/api${path}`, { ...init, headers, body, credentials: 'same-origin' });
  if (!res.ok) {
    let message = res.status === 429 ? 'Too many requests — please wait a moment and try again.' : res.statusText;
    try {
      const data = await res.json();
      if (data?.message) message = Array.isArray(data.message) ? data.message[0] : data.message;
    } catch {
      /* non-JSON error */
    }
    throw new ApiError(message || 'Request failed', res.status);
  }
  if (res.status === 204) return undefined as T;
  const type = res.headers.get('content-type') ?? '';
  return (type.includes('application/json') ? res.json() : res.text()) as Promise<T>;
}

const cache = new Map<string, { data: unknown; at: number }>();

export function invalidate(prefix = '') {
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key);
}

interface UseApiState<T> {
  data: T | undefined;
  error: ApiError | undefined;
  loading: boolean;
}

/**
 * Small data hook with an in-memory cache. Public pages reuse cached data for `ttl` ms;
 * admin screens pass ttl: 0 to always refetch while still showing the last result.
 */
export function useApi<T>(path: string | null, { ttl = 60_000 }: { ttl?: number } = {}) {
  const [state, setState] = useState<UseApiState<T>>(() => {
    const hit = path ? cache.get(path) : undefined;
    return { data: hit?.data as T | undefined, error: undefined, loading: !!path && !hit };
  });
  const [nonce, setNonce] = useState(0);
  const currentPath = useRef(path);
  currentPath.current = path;

  useEffect(() => {
    if (!path) {
      setState({ data: undefined, error: undefined, loading: false });
      return;
    }
    const hit = cache.get(path);
    if (hit) setState({ data: hit.data as T, error: undefined, loading: false });
    if (hit && Date.now() - hit.at < ttl && nonce === 0) return;

    let alive = true;
    setState((s) => ({ data: hit ? (hit.data as T) : s.data, error: undefined, loading: true }));
    api<T>(path)
      .then((data) => {
        cache.set(path, { data, at: Date.now() });
        if (alive && currentPath.current === path) setState({ data, error: undefined, loading: false });
      })
      .catch((error: ApiError) => {
        if (alive) setState((s) => ({ data: s.data, error, loading: false }));
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, nonce]);

  const reload = useCallback(() => {
    if (path) cache.delete(path);
    setNonce((n) => n + 1);
  }, [path]);

  const mutate = useCallback(
    (updater: (prev: T | undefined) => T) => {
      setState((s) => {
        const data = updater(s.data);
        if (path) cache.set(path, { data, at: Date.now() });
        return { ...s, data };
      });
    },
    [path],
  );

  return { ...state, reload, mutate };
}

export function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

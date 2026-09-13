import { api, ApiError, useApi } from '../lib/api';

export const UNAUTHORIZED_EVENT = 'pdn:admin-unauthorized';

/** Admin API wrapper: a 401 anywhere signs the admin out of the UI immediately. */
export async function adminApi<T>(path: string, init?: Parameters<typeof api>[1]): Promise<T> {
  try {
    return await api<T>(path, init);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw err;
  }
}

/** Always refetch in admin screens so editors see the latest data. */
export function useAdminApi<T>(path: string | null) {
  const result = useApi<T>(path, { ttl: 0 });
  if (result.error?.status === 401) queueMicrotask(() => window.dispatchEvent(new Event(UNAUTHORIZED_EVENT)));
  return result;
}

export async function uploadFiles(files: File[]) {
  const body = new FormData();
  files.forEach((f) => body.append('files', f));
  return adminApi<MediaItem[]>('/admin/media', { method: 'POST', body });
}

export interface MediaItem {
  id: number;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string;
  createdAt: string;
}

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: 'OWNER' | 'EDITOR';
  totpEnabled: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
}

export interface ContinentRow {
  id: number;
  name: string;
  slug: string;
  tagline: string | null;
  image: string | null;
  sortOrder: number;
  _count: { countries: number };
}

export interface CountryRow {
  id: number;
  name: string;
  slug: string;
  continentId: number;
  region: string | null;
  summary: string | null;
  highlight: string | null;
  image: string | null;
  heroImage: string | null;
  currency: string | null;
  language: string | null;
  bestSeason: string | null;
  visaNote: string | null;
  isFeatured: boolean;
  sortOrder: number;
  continent: { id: number; name: string };
  _count: { trips: number };
}

export interface ActivityRow {
  id: number;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
  image: string | null;
  sortOrder: number;
  _count: { trips: number };
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

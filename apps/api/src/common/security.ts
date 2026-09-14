import type { NextFunction, Request, Response } from 'express';
import { join } from 'path';

export const SESSION_COOKIE = 'pdn_admin';

/** Directory for uploaded media. Override with UPLOADS_DIR to point at a persistent disk in production. */
export function uploadsDir(): string {
  return process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');
}

export function allowedOrigins(): string[] {
  return (process.env.WEB_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/** Canonical public origin for absolute URLs (sitemap, Open Graph) — the first configured WEB_ORIGIN. */
export function siteUrl(): string {
  return allowedOrigins()[0] ?? 'http://localhost:5173';
}

export function cookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: maxAgeMs,
  };
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence in depth (on top of SameSite=strict cookies): state-changing requests
 * that carry an Origin header must come from the website's own origin.
 */
export function originCheck(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.headers.origin;
  if (!origin) return next();
  const host = req.headers.host;
  const sameHost = !!host && (origin === `http://${host}` || origin === `https://${host}`);
  if (sameHost || allowedOrigins().includes(origin)) return next();
  res.status(403).json({ statusCode: 403, message: 'Cross-origin request blocked' });
}

export function clientIp(req: Request): string {
  return (req.ip ?? req.socket?.remoteAddress ?? '').slice(0, 64);
}

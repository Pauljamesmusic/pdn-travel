import type { PrismaService } from '../prisma/prisma.service';

export function slugify(input: string): string {
  return input
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function toInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export async function audit(
  prisma: PrismaService,
  userId: number | undefined,
  action: string,
  entity: string,
  entityId?: string | number,
  ip?: string,
) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entity, entityId: entityId?.toString(), ip },
    });
  } catch {
    // Auditing must never break the request.
  }
}

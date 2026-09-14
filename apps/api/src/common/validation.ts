import { applyDecorators, ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { ValidationOptions, Matches, MaxLength } from 'class-validator';

/** Relative site paths (/uploads/..., /media/...) or https URLs. Blocks javascript:, data: etc. */
export const SAFE_URL = /^(\/(?!\/)[^\s<>"'`]*|https:\/\/[^\s<>"'`]+)$/;
const SAFE_URL_MAX_LENGTH = 1000;

// Composed so every `@IsSafeUrl()` field also gets the same length cap as the `isSafeUrl()`
// runtime check below — the bare `Matches` regex has no length limit of its own and would
// otherwise let a multi-megabyte string through as long as it matched the pattern.
export const IsSafeUrl = (options?: ValidationOptions) =>
  applyDecorators(
    MaxLength(SAFE_URL_MAX_LENGTH, options),
    Matches(SAFE_URL, { message: 'Use an uploaded image or an https:// link', ...options }),
  );

export function isSafeUrl(value: unknown): value is string {
  return typeof value === 'string' && value.length <= SAFE_URL_MAX_LENGTH && SAFE_URL.test(value);
}

const IMAGE_URL_KEYS = new Set(['image', 'photo', 'avatar', 'logo', 'url']);

/**
 * Recursively walks admin-authored JSON (CMS page blocks, site/home settings) and blanks any
 * string found under an image-shaped key (image, photo, avatar, logo, url — matching the block
 * editor's `kind: 'image'` fields and gallery `{ url, alt }` items) that isn't a safe URL. Mirrors
 * trips.service.ts's `sanitizeSection`, generalized for content whose shape isn't a fixed DTO.
 */
export function sanitizeImageUrlsDeep<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => sanitizeImageUrlsDeep(v)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      out[key] = typeof v === 'string' && IMAGE_URL_KEYS.has(key.toLowerCase()) ? (isSafeUrl(v) ? v : '') : sanitizeImageUrlsDeep(v);
    }
    return out as T;
  }
  return value;
}

/** Turns common database errors into friendly API responses instead of 500s. */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    switch (exception.code) {
      case 'P2002': {
        const target = (exception.meta?.target as string[] | string | undefined)?.toString() ?? 'value';
        return res.status(HttpStatus.CONFLICT).json({
          statusCode: 409,
          message: target.includes('slug')
            ? 'That URL slug is already used — choose another'
            : `That ${target} is already in use`,
        });
      }
      case 'P2003':
        return res.status(HttpStatus.CONFLICT).json({
          statusCode: 409,
          message: 'This item is still linked to other content',
        });
      case 'P2025':
        return res.status(HttpStatus.NOT_FOUND).json({ statusCode: 404, message: 'Not found' });
      default:
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ statusCode: 500, message: 'Something went wrong saving your changes' });
    }
  }
}

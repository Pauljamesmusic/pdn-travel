import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { ValidationOptions, Matches } from 'class-validator';

/** Relative site paths (/uploads/..., /media/...) or https URLs. Blocks javascript:, data: etc. */
export const SAFE_URL = /^(\/(?!\/)[^\s<>"'`]*|https:\/\/[^\s<>"'`]+)$/;

export const IsSafeUrl = (options?: ValidationOptions) =>
  Matches(SAFE_URL, { message: 'Use an uploaded image or an https:// link', ...options });

export function isSafeUrl(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 1000 && SAFE_URL.test(value);
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

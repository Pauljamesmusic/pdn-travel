import 'reflect-metadata';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import { existsSync, mkdirSync } from 'fs';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { allowedOrigins, originCheck, uploadsDir } from './common/security';
import { PrismaExceptionFilter } from './common/validation';
import { PublicService } from './public/public.service';

// CSP hash for index.html's inline theme/language pre-paint script (see the matching comment
// there). Whitespace-sensitive — if that script's exact text ever changes, recompute this with:
//   node -e "console.log('sha256-'+require('crypto').createHash('sha256').update(require('fs').readFileSync('apps/web/index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1]).digest('base64'))"
const THEME_SCRIPT_HASH = "'sha256-iUpdN31SV0c0i3ZJLnr8TQvYHTWi2jPWpfQUoztmk1M='";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // Applies to every response this process sends, including the built web app it serves
      // same-origin in production (see the static-assets block below) — not just the JSON API.
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", THEME_SCRIPT_HASH],
          // 'unsafe-inline' for styles only: React's inline `style={{...}}` attributes (used
          // throughout the site for per-item animation delays etc.) can't be expressed as a hash.
          styleSrc: ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          // https: (not a fixed allowlist) because admin-entered content can link any https://
          // image URL — see IsSafeUrl's SAFE_URL pattern in common/validation.ts.
          imgSrc: ["'self'", 'data:', 'https:'],
          mediaSrc: ["'self'"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
    }),
  );
  app.use(cookieParser());
  app.use(originCheck);

  app.enableCors({ origin: allowedOrigins(), credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Uploaded images (already re-encoded to WebP by the media service). Create the folder
  // up front — on a fresh persistent disk (see UPLOADS_DIR / render.yaml) nothing has been
  // uploaded yet, so it won't exist until the first upload otherwise.
  mkdirSync(uploadsDir(), { recursive: true });
  app.useStaticAssets(uploadsDir(), {
    prefix: '/uploads',
    maxAge: '30d',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  });

  // Registered directly on the underlying Express instance (not as Nest controller routes)
  // and outside the `/api` prefix, at the site root where crawlers look for them by
  // convention — and specifically *before* the SPA catch-all below, which would otherwise
  // swallow every path it doesn't recognize (including these) and serve index.html instead.
  const publicService = app.get(PublicService);
  const httpAdapter = app.getHttpAdapter().getInstance();
  httpAdapter.get('/robots.txt', (_req: Request, res: Response) => {
    res.type('text/plain').send(publicService.getRobotsTxt());
  });
  httpAdapter.get('/sitemap.xml', async (_req: Request, res: Response) => {
    res.type('application/xml').send(await publicService.getSitemapXml());
  });

  // Same-origin deploy: serve the built web app alongside the API so admin auth
  // cookies (SameSite=strict) work without a separate frontend host.
  const webDist = join(process.cwd(), '../web/dist');
  if (existsSync(webDist)) {
    app.useStaticAssets(webDist, { index: false, maxAge: '1h' });
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
      res.sendFile(join(webDist, 'index.html'));
    });
  }

  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(`PDN Travel API running on http://localhost:${port}/api`, 'Bootstrap');
}

bootstrap();

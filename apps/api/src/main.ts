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

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false, // API returns JSON only; the web app sets its own CSP
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

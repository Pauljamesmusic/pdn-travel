import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { AdminAuthGuard } from './common/admin-auth.guard';
import { PrismaModule } from './prisma/prisma.module';
import { PublicModule } from './public/public.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),
    JwtModule.registerAsync({
      global: true,
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret || secret.length < 32 || secret === 'change-me') {
          throw new Error('JWT_SECRET must be set to a long random value in apps/api/.env');
        }
        return { secret, signOptions: { issuer: 'pdn-travel' } };
      },
    }),
    PrismaModule,
    AuthModule,
    PublicModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Every route under /api/admin requires a valid admin session — secure by default.
    { provide: APP_GUARD, useClass: AdminAuthGuard },
  ],
})
export class AppModule {}

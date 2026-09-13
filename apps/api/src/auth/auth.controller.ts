import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser, resolveSession, type SessionUser } from '../common/admin-auth.guard';
import { clientIp } from '../common/security';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto, LoginDto, MfaDto, TotpCodeDto } from './auth.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(dto.email, dto.password, !!dto.remember, clientIp(req), res);
  }

  @Post('mfa')
  @HttpCode(200)
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  mfa(@Body() dto: MfaDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.verifyMfa(dto.mfaToken, dto.code, !!dto.remember, clientIp(req), res);
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    return this.auth.logout(res);
  }

  /** Returns `{ user: null }` when signed out so the admin UI can check without a 401. */
  @Get('session')
  async session(@Req() req: Request) {
    const user = await resolveSession(req, this.jwt, this.prisma);
    if (!user) return { user: null };
    const full = await this.prisma.adminUser.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, name: true, role: true, totpEnabled: true, lastLoginAt: true },
    });
    return { user: full };
  }
}

/** Account actions for the signed-in admin. Lives under /api/admin so the global guard applies. */
@Controller('admin/account')
export class AccountController {
  constructor(private readonly auth: AuthService) {}

  @Post('password')
  @HttpCode(200)
  changePassword(
    @CurrentUser() user: SessionUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.changePassword(user, dto.currentPassword, dto.newPassword, clientIp(req), res);
  }

  @Post('logout-all')
  @HttpCode(200)
  logoutAll(@CurrentUser() user: SessionUser, @Res({ passthrough: true }) res: Response) {
    return this.auth.logoutEverywhere(user, res);
  }

  @Post('2fa/setup')
  @HttpCode(200)
  setup(@CurrentUser() user: SessionUser) {
    return this.auth.setupTotp(user);
  }

  @Post('2fa/enable')
  @HttpCode(200)
  enable(@CurrentUser() user: SessionUser, @Body() dto: TotpCodeDto, @Req() req: Request) {
    return this.auth.enableTotp(user, dto.code, clientIp(req));
  }

  @Post('2fa/disable')
  @HttpCode(200)
  disable(@CurrentUser() user: SessionUser, @Body() dto: TotpCodeDto, @Req() req: Request) {
    return this.auth.disableTotp(user, dto.code, clientIp(req));
  }
}

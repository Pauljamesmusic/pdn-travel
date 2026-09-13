import { BadRequestException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AdminUser } from '@prisma/client';
import bcrypt from 'bcryptjs';
import type { Response } from 'express';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import type { AdminRole, SessionPayload, SessionUser } from '../common/admin-auth.guard';
import { SESSION_COOKIE, cookieOptions } from '../common/security';
import { audit } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const SESSION_HOURS = 8;
const REMEMBER_DAYS = 7;
// Used so a login for an unknown email costs the same time as a real one.
const DUMMY_HASH = bcrypt.hashSync('pdn-timing-equaliser', 12);

authenticator.options = { window: 1 };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string, remember: boolean, ip: string, res: Response) {
    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.adminUser.findUnique({ where: { email: normalized } });

    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      throw new HttpException(
        `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      // Atomic increment — reading failedLogins and writing it back as a literal would lose
      // updates when concurrent wrong-password requests race, letting the lockout be bypassed.
      const updated = await this.prisma.adminUser.update({
        where: { id: user.id },
        data: { failedLogins: { increment: 1 } },
      });
      if (updated.failedLogins >= MAX_ATTEMPTS) {
        await this.prisma.adminUser.update({
          where: { id: user.id },
          data: { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) },
        });
      }
      await audit(this.prisma, user.id, 'login.failed', 'AdminUser', user.id, ip);
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: null },
    });

    if (user.totpEnabled && user.totpSecret) {
      const mfaToken = await this.jwt.signAsync(
        { sub: user.id, purpose: 'mfa' },
        { expiresIn: '5m', issuer: 'pdn-travel' },
      );
      return { mfaRequired: true as const, mfaToken };
    }

    return this.startSession(user, remember, ip, res);
  }

  async verifyMfa(mfaToken: string, code: string, remember: boolean, ip: string, res: Response) {
    let payload: { sub: number; purpose: string };
    try {
      payload = await this.jwt.verifyAsync(mfaToken, { issuer: 'pdn-travel' });
    } catch {
      throw new UnauthorizedException('Your sign-in step expired. Please start again.');
    }
    if (payload.purpose !== 'mfa') throw new UnauthorizedException();
    const user = await this.prisma.adminUser.findUnique({ where: { id: payload.sub } });
    if (!user?.totpEnabled || !user.totpSecret) throw new UnauthorizedException();
    if (!authenticator.check(code, user.totpSecret)) {
      await audit(this.prisma, user.id, 'mfa.failed', 'AdminUser', user.id, ip);
      throw new UnauthorizedException('That code is not valid');
    }
    return this.startSession(user, remember, ip, res);
  }

  logout(res: Response) {
    res.clearCookie(SESSION_COOKIE, { ...cookieOptions(0), maxAge: undefined });
    return { ok: true };
  }

  async logoutEverywhere(user: SessionUser, res: Response) {
    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: { tokenVersion: { increment: 1 } },
    });
    return this.logout(res);
  }

  async changePassword(sessionUser: SessionUser, current: string, next: string, ip: string, res: Response) {
    const user = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: sessionUser.id } });
    if (!(await bcrypt.compare(current, user.passwordHash))) {
      throw new BadRequestException('Current password is incorrect');
    }
    const updated = await this.prisma.adminUser.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(next, 12), tokenVersion: { increment: 1 } },
    });
    await audit(this.prisma, user.id, 'password.changed', 'AdminUser', user.id, ip);
    // Other devices are signed out; keep this one signed in.
    return this.startSession(updated, false, ip, res);
  }

  async setupTotp(sessionUser: SessionUser) {
    const existing = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: sessionUser.id } });
    if (existing.totpEnabled) {
      throw new BadRequestException('Two-factor sign-in is already on. Turn it off first to set up a new device.');
    }
    const secret = authenticator.generateSecret();
    await this.prisma.adminUser.update({
      where: { id: sessionUser.id },
      data: { totpSecret: secret, totpEnabled: false },
    });
    const otpauth = authenticator.keyuri(sessionUser.email, 'PDN Travel Admin', secret);
    const qr = await QRCode.toDataURL(otpauth, { margin: 1, width: 220 });
    return { otpauth, qr, secret };
  }

  async enableTotp(sessionUser: SessionUser, code: string, ip: string) {
    const user = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: sessionUser.id } });
    if (!user.totpSecret || !authenticator.check(code, user.totpSecret)) {
      throw new BadRequestException('That code is not valid — check the time on your phone and try again');
    }
    await this.prisma.adminUser.update({ where: { id: user.id }, data: { totpEnabled: true } });
    await audit(this.prisma, user.id, '2fa.enabled', 'AdminUser', user.id, ip);
    return { ok: true };
  }

  async disableTotp(sessionUser: SessionUser, code: string, ip: string) {
    const user = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: sessionUser.id } });
    if (!user.totpEnabled || !user.totpSecret || !authenticator.check(code, user.totpSecret)) {
      throw new BadRequestException('That code is not valid');
    }
    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: { totpEnabled: false, totpSecret: null },
    });
    await audit(this.prisma, user.id, '2fa.disabled', 'AdminUser', user.id, ip);
    return { ok: true };
  }

  private async startSession(user: AdminUser, remember: boolean, ip: string, res: Response) {
    const maxAge = remember ? REMEMBER_DAYS * 24 * 3600_000 : SESSION_HOURS * 3600_000;
    const payload: SessionPayload = {
      sub: user.id,
      role: user.role as AdminRole,
      tv: user.tokenVersion,
      purpose: 'session',
    };
    const token = await this.jwt.signAsync(payload, {
      expiresIn: Math.floor(maxAge / 1000),
      issuer: 'pdn-travel',
    });
    res.cookie(SESSION_COOKIE, token, cookieOptions(maxAge));
    await this.prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await audit(this.prisma, user.id, 'login.success', 'AdminUser', user.id, ip);
    return {
      mfaRequired: false as const,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, totpEnabled: user.totpEnabled },
    };
  }
}

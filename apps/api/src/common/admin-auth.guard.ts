import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { SESSION_COOKIE } from './security';

export type AdminRole = 'OWNER' | 'EDITOR';

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: AdminRole;
}

export interface SessionPayload {
  sub: number;
  role: AdminRole;
  tv: number;
  purpose: 'session';
}

const ROLES_KEY = 'pdn:roles';
/** Restrict an admin route to specific roles (default: any signed-in admin). */
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<Request & { admin?: SessionUser }>();
  return req.admin;
});

/**
 * Global guard. Anything under /api/admin needs a valid, non-revoked session cookie.
 * The token version (tv) lets us revoke every session on logout-all / password change.
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { admin?: SessionUser }>();
    const path = req.path ?? req.url;
    if (!path.startsWith('/api/admin')) return true;

    const user = await resolveSession(req, this.jwt, this.prisma);
    if (!user) throw new UnauthorizedException('Please sign in');

    const roles = this.reflector.getAllAndOverride<AdminRole[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (roles?.length && !roles.includes(user.role)) {
      throw new ForbiddenException('You do not have permission for this action');
    }
    req.admin = user;
    return true;
  }
}

export async function resolveSession(
  req: Request,
  jwt: JwtService,
  prisma: PrismaService,
): Promise<SessionUser | null> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token || typeof token !== 'string') return null;
  try {
    const payload = await jwt.verifyAsync<SessionPayload>(token, { issuer: 'pdn-travel' });
    if (payload.purpose !== 'session') return null;
    const user = await prisma.adminUser.findUnique({ where: { id: payload.sub } });
    if (!user || user.tokenVersion !== payload.tv) return null;
    return { id: user.id, email: user.email, name: user.name, role: user.role as AdminRole };
  } catch {
    return null;
  }
}

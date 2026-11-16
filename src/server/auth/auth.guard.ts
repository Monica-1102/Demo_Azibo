import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC, ROLES, SessionUser } from './auth.decorators';

export const SESSION_COOKIE = 'azibo_session';
/** Header every state-changing request must carry. A cross-site form or link cannot set it. */
export const CSRF_HEADER = 'x-azibo-csrf';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Runs first on every route: CSRF header, then login (unless @Public), then roles. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { user?: SessionUser }>();

    if (!SAFE_METHODS.has(req.method) && req.headers[CSRF_HEADER] !== '1') {
      throw new ForbiddenException('Missing request header.');
    }

    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) throw new UnauthorizedException('Please sign in.');
    try {
      const p = await this.jwt.verifyAsync<{ sub: number; cid: number; ut: number; name: string; un: string }>(token);
      req.user = { id: p.sub, companyId: p.cid, userType: p.ut, fullName: p.name, username: p.un };
    } catch {
      throw new UnauthorizedException('Your session has ended. Please sign in again.');
    }

    const roles = this.reflector.getAllAndOverride<number[]>(ROLES, targets);
    if (roles?.length && !roles.includes(req.user.userType)) {
      throw new ForbiddenException('Your user type cannot do this.');
    }
    return true;
  }
}

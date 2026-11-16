import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { loginSchema, type LoginInput } from '../../shared/schemas';
import { ZodPipe } from '../common/zod.pipe';
import { CurrentUser, Public, type SessionUser } from './auth.decorators';
import { SESSION_COOKIE } from './auth.guard';
import { AuthService } from './auth.service';

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: Number(process.env.JWT_TTL_MINUTES ?? 480) * 60_000,
});

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(@Body(new ZodPipe(loginSchema)) body: LoginInput, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.auth.login(body);
    res.cookie(SESSION_COOKIE, token, cookieOptions());
    return this.auth.profile(user);
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    const { maxAge: _maxAge, ...opts } = cookieOptions();
    res.clearCookie(SESSION_COOKIE, opts);
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: SessionUser) {
    return this.auth.profile(user);
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import { USER_TYPES } from '../../shared/constants';
import type { LoginInput } from '../../shared/schemas';
import { PrismaService } from '../db/prisma.service';
import type { SessionUser } from './auth.decorators';

@Injectable()
export class AuthService {
  // Checked when the user name is unknown, so both cases take about the same time.
  private readonly dummyHash = hash(`unused-${Date.now()}`);

  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async login(input: LoginInput): Promise<{ token: string; user: SessionUser }> {
    // users / companies have no RLS: the company is not known before sign-in.
    const user = await this.prisma.user.findUnique({ where: { username: input.username } });
    const ok = await verify(user?.passwordHash ?? (await this.dummyHash), input.password).catch(() => false);
    if (!user || !ok || !user.isActive || !user.canLogin) {
      throw new UnauthorizedException('Invalid user name or password.');
    }
    const session: SessionUser = {
      id: user.id, companyId: user.companyId, userType: user.userType, fullName: user.fullName, username: user.username,
    };
    const token = await this.jwt.signAsync({
      sub: user.id, cid: user.companyId, ut: user.userType, name: user.fullName, un: user.username,
    });
    return { token, user: session };
  }

  async profile(user: SessionUser) {
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: user.companyId }, select: { id: true, name: true, prefix: true } });
    return { ...user, userTypeName: USER_TYPES[user.userType] ?? `Type ${user.userType}`, company };
  }
}

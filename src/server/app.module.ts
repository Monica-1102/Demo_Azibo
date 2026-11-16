import { Controller, Get, Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Public } from './auth/auth.decorators';
import { AuthModule } from './auth/auth.module';
import { CostingModule } from './costing/costing.module';
import { DbModule } from './db/db.module';
import { PrismaService } from './db/prisma.service';
import { EnquiryModule } from './enquiry/enquiry.module';
import { MastersModule } from './masters/masters.controller';
import { WipModule } from './wip/wip.module';

/** The built Next.js screens (next build -> static export). Served by this same program. */
export const WEB_OUT = join(process.cwd(), 'src', 'web', 'out');

@Controller('health')
class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  }
}

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    // On Vercel the screens are served by Vercel itself, not by this function.
    ...(existsSync(WEB_OUT) && !process.env.VERCEL
      ? [ServeStaticModule.forRoot({ rootPath: WEB_OUT, exclude: ['/api/{*path}'], serveStaticOptions: { extensions: ['html'] } })]
      : []),
    DbModule,
    AuthModule,
    MastersModule,
    EnquiryModule,
    CostingModule,
    WipModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

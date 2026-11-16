import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

export type Tx = Prisma.TransactionClient;

/**
 * Runs work for one company inside a transaction that first sets app.company_id.
 * PostgreSQL row-level security (migration *_rls_and_grants) then hides and blocks
 * every row of other companies. Services also filter on companyId, so a forgotten
 * filter is caught by the database rather than leaking data.
 */
@Injectable()
export class TenantDb {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(companyId: number, fn: (tx: Tx) => Promise<T>): Promise<T> {
    if (!Number.isInteger(companyId) || companyId <= 0) throw new Error('Company context missing');
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.company_id', ${String(companyId)}, true)`;
      return fn(tx);
    });
  }
}

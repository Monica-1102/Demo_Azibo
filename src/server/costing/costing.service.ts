import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { USER_TYPE_MERCHANT } from '../../shared/constants';
import { lineAmount, type PreCostingInput } from '../../shared/schemas';
import type { SessionUser } from '../auth/auth.decorators';
import { TenantDb } from '../db/tenant-db.service';
import { enquiryListSelect, visibleTo } from '../enquiry/enquiry.service';
import { AuthorizationService } from './authorization.service';

const preCostingSelect = {
  id: true,
  component: true,
  currency: true,
  totalCost: true,
  remarks: true,
  updatedAt: true,
  lines: {
    select: { lineNo: true, costHead: true, description: true, uom: true, consumption: true, rate: true, amount: true },
    orderBy: { lineNo: 'asc' },
  },
} satisfies Prisma.PreCostingSelect;

@Injectable()
export class CostingService {
  constructor(private readonly db: TenantDb, private readonly authorization: AuthorizationService) {}

  async get(user: SessionUser, enquiryId: number) {
    return this.db.run(user.companyId, async (tx) => {
      const enquiry = await tx.enquiry.findFirst({ where: { ...visibleTo(user), id: enquiryId }, select: enquiryListSelect });
      if (!enquiry) throw new NotFoundException('Enquiry not found.');
      const preCosting = await tx.preCosting.findUnique({ where: { enquiryId }, select: preCostingSelect });
      return { enquiry, preCosting, canEdit: user.userType === USER_TYPE_MERCHANT && enquiry.merchantId === user.id };
    });
  }

  /** Saves the pre-costing and, in the same transaction, authorizes the order. */
  async save(user: SessionUser, enquiryId: number, input: PreCostingInput) {
    return this.db.run(user.companyId, async (tx) => {
      const enquiry = await tx.enquiry.findFirst({
        where: { companyId: user.companyId, merchantId: user.id, id: enquiryId },
        select: { id: true },
      });
      if (!enquiry) throw new ForbiddenException('Only the merchant who owns this enquiry can save its pre-costing.');

      const lines = input.lines.map((l, i) => ({
        companyId: user.companyId,
        lineNo: i + 1,
        costHead: l.costHead,
        description: l.description || null,
        uom: l.uom,
        consumption: new Prisma.Decimal(l.consumption),
        rate: new Prisma.Decimal(l.rate),
        amount: new Prisma.Decimal(lineAmount(l.consumption, l.rate)),
      }));
      const total = lines.reduce((sum, l) => sum.plus(l.amount), new Prisma.Decimal(0));

      const pc = await tx.preCosting.upsert({
        where: { enquiryId },
        create: {
          companyId: user.companyId, enquiryId, component: input.component, currency: input.currency,
          remarks: input.remarks || null, totalCost: total, createdById: user.id, updatedById: user.id,
        },
        update: { component: input.component, currency: input.currency, remarks: input.remarks || null, totalCost: total, updatedById: user.id },
        select: { id: true },
      });
      await tx.preCostingLine.deleteMany({ where: { preCostingId: pc.id, companyId: user.companyId } });
      await tx.preCostingLine.createMany({ data: lines.map((l) => ({ ...l, preCostingId: pc.id })) });

      const authorized = await this.authorization.authorize(tx, enquiryId, user.companyId);
      const preCosting = await tx.preCosting.findUniqueOrThrow({ where: { enquiryId }, select: preCostingSelect });
      const order = await tx.enquiry.findUniqueOrThrow({ where: { id: enquiryId }, select: enquiryListSelect });
      return { preCosting, enquiry: order, authorizedNow: authorized !== null };
    });
  }
}

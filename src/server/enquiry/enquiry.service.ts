import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ORDER_STATUS, ORDER_STATUS_LABEL, USER_TYPE_MERCHANT } from '../../shared/constants';
import type { EnquiryInput } from '../../shared/schemas';
import type { SessionUser } from '../auth/auth.decorators';
import { TenantDb } from '../db/tenant-db.service';

export const enquiryListSelect = {
  id: true,
  enquiryRefNo: true,
  enquiryType: true,
  reqForIsrIor: true,
  styleRefNo: true,
  styleDesc: true,
  orderQty: true,
  pcsOrSet: true,
  sizes: true,
  currency: true,
  quotedPrice: true,
  enquiryDate: true,
  shipmentDate: true,
  merchantNote: true,
  modeOfEnquiry: true,
  noOfComponents: true,
  noOfCombo: true,
  priceQuotedFor: true,
  buyerPrice: true,
  confirmPrice: true,
  isrRefAny: true,
  season: true,
  className: true,
  diviDept: true,
  subClass: true,
  oeRemarks: true,
  orderStatus: true,
  isrIorCode: true,
  dateAuthorized: true,
  createdAt: true,
  merchantId: true,
  merchant: { select: { fullName: true, code: true, mobile: true, email: true } },
  authorizedBy: { select: { fullName: true } },
  buyer: { select: { id: true, name: true, country: true } },
  brand: { select: { id: true, name: true } },
  statusLogs: {
    where: { orderStatus: 2 },
    select: { comments: true },
    orderBy: { id: 'desc' },
    take: 1,
  },
} satisfies Prisma.EnquirySelect;

/**
 * Which enquiries a user may see: a merchant sees their own; other users of the
 * company (read only) see all of the company's. companyId is always in the filter,
 * and RLS enforces it again in the database.
 */
export function visibleTo(user: SessionUser): Prisma.EnquiryWhereInput {
  return user.userType === USER_TYPE_MERCHANT
    ? { companyId: user.companyId, merchantId: user.id }
    : { companyId: user.companyId };
}

const toDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

@Injectable()
export class EnquiryService {
  constructor(private readonly db: TenantDb) {}

  list(user: SessionUser) {
    return this.db.run(user.companyId, (tx) =>
      tx.enquiry.findMany({ where: visibleTo(user), select: enquiryListSelect, orderBy: { id: 'desc' } }),
    );
  }

  async get(user: SessionUser, id: number) {
    const row = await this.db.run(user.companyId, (tx) =>
      tx.enquiry.findFirst({ where: { ...visibleTo(user), id }, select: enquiryListSelect }),
    );
    if (!row) throw new NotFoundException('Enquiry not found.');
    return row;
  }

  async create(user: SessionUser, input: EnquiryInput) {
    return this.db.run(user.companyId, async (tx) => {
      // As in the current form, the buyer (and its country) come from the brand.
      const brand = await tx.brand.findFirst({
        where: { id: input.brandId, companyId: user.companyId, isActive: true },
        select: { id: true, buyerId: true },
      });
      if (!brand) throw new BadRequestException({ message: 'Please correct the highlighted fields.', errors: [{ path: 'brandId', message: 'Select a valid brand' }] });

      const duplicate = await tx.enquiry.findFirst({
        where: { companyId: user.companyId, enquiryRefNo: { equals: input.enquiryRefNo, mode: 'insensitive' } },
        select: { id: true },
      });
      if (duplicate) {
        throw new ConflictException({ message: 'Please correct the highlighted fields.', errors: [{ path: 'enquiryRefNo', message: 'This Order / Enq. Ref. No already exists' }] });
      }

      const enquiry = await tx.enquiry.create({
        data: {
          companyId: user.companyId,
          merchantId: user.id,
          createdById: user.id,
          enquiryRefNo: input.enquiryRefNo,
          enquiryType: input.enquiryType,
          modeOfEnquiry: input.modeOfEnquiry,
          reqForIsrIor: input.reqForIsrIor,
          isrRefAny: input.isrRefAny || null,
          buyerId: brand.buyerId,
          brandId: brand.id,
          styleRefNo: input.styleRefNo,
          styleDesc: input.styleDesc,
          orderQty: input.orderQty,
          pcsOrSet: input.pcsOrSet,
          noOfComponents: input.noOfComponents,
          noOfCombo: input.noOfCombo,
          sizes: input.sizes,
          priceQuotedFor: input.priceQuotedFor,
          currency: input.currency,
          quotedPrice: input.quotedPrice ?? null,
          buyerPrice: input.buyerPrice ?? null,
          confirmPrice: input.confirmPrice ?? null,
          enquiryDate: toDate(input.enquiryDate),
          shipmentDate: toDate(input.shipmentDate),
          merchantNote: input.merchantNote || null,
          orderStatus: ORDER_STATUS.NEW,
        },
        select: enquiryListSelect,
      });
      await tx.enquiryStatusLog.create({
        data: {
          companyId: user.companyId,
          enquiryId: enquiry.id,
          orderStatus: ORDER_STATUS.NEW,
          statusValue: ORDER_STATUS_LABEL[ORDER_STATUS.NEW],
          comments: 'Enquiry created',
          actedById: user.id,
        },
      });
      return enquiry;
    });
  }
}

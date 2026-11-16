import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ORDER_STATUS, ORDER_STATUS_LABEL, USER_TYPE_MANAGEMENT } from '../../shared/constants';
import { fiscalYearOf, formatOrderCode } from '../../shared/order-code';
import type { Tx } from '../db/tenant-db.service';

/**
 * Demo replacement for management authorization (Menquirymodel::fnAuthorize).
 * Called inside the pre-costing save transaction. It does the same four things:
 *  1. order status APPROVED, authorized date/time, a fixed demo user as authorizer;
 *  2. the ISR / IOR (WIP) code: <ISR|IOR>/<mmyy>/<company prefix>-<next number>;
 *  3. a status history row;
 *  4. the order is now on the merchant's WIP list (the list shows APPROVED orders).
 */
@Injectable()
export class AuthorizationService {
  async authorize(tx: Tx, enquiryId: number, companyId: number) {
    const now = new Date();
    const enquiry = await tx.enquiry.findFirstOrThrow({
      where: { id: enquiryId, companyId },
      select: { id: true, orderStatus: true, reqForIsrIor: true, isrIorCode: true },
    });
    if (enquiry.orderStatus === ORDER_STATUS.APPROVED) return null; // already authorized

    // companies / users have no RLS; read them by the company id from the session.
    const company = await tx.company.findUniqueOrThrow({ where: { id: companyId }, select: { prefix: true } });
    const authorizer = await tx.user.findFirst({
      where: { companyId, userType: USER_TYPE_MANAGEMENT, canLogin: false, isActive: true },
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    if (!authorizer) {
      throw new InternalServerErrorException('Demo authorizing user is missing for this company. Run the seed.');
    }

    // Next number for this company and fiscal year. One atomic statement, so two saves
    // at the same moment can never get the same number (today's count+1 could).
    const fy = fiscalYearOf(now);
    const [{ last_no: no }] = await tx.$queryRaw<{ last_no: number }[]>`
      INSERT INTO order_code_counters (company_id, fiscal_year, last_no)
      VALUES (${companyId}, ${fy}, 1)
      ON CONFLICT (company_id, fiscal_year)
      DO UPDATE SET last_no = order_code_counters.last_no + 1
      RETURNING last_no`;
    const code = formatOrderCode(enquiry.reqForIsrIor, now, company.prefix, Number(no));

    const comments = 'Authorized automatically on pre-costing save (demo).';
    const updated = await tx.enquiry.update({
      where: { id: enquiry.id },
      data: {
        orderStatus: ORDER_STATUS.APPROVED,
        isrIorNo: Number(no),
        isrIorCode: code,
        dateAuthorized: now,
        authorizedById: authorizer.id,
      },
      select: { id: true, orderStatus: true, isrIorCode: true, dateAuthorized: true },
    });
    await tx.enquiryStatusLog.create({
      data: {
        companyId,
        enquiryId: enquiry.id,
        orderStatus: ORDER_STATUS.APPROVED,
        statusValue: ORDER_STATUS_LABEL[ORDER_STATUS.APPROVED],
        isrIorCode: code,
        comments,
        actedById: authorizer.id,
      },
    });
    return updated;
  }
}

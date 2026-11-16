import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ORDER_STATUS, USER_TYPE_MERCHANT } from '../../shared/constants';
import {
  buildGeneratedRows, deriveRows, orderOptions, validateRows,
  type GridRow, type SubTab,
} from '../../shared/grids';
import type { OrderDetailsInput } from '../../shared/schemas';
import type { SessionUser } from '../auth/auth.decorators';
import { TenantDb, type Tx } from '../db/tenant-db.service';
import { enquiryListSelect, visibleTo } from '../enquiry/enquiry.service';

const asRows = (v: Prisma.JsonValue | undefined): GridRow[] => (Array.isArray(v) ? (v as GridRow[]) : []);

@Injectable()
export class WipService {
  constructor(private readonly db: TenantDb) {}

  /**
   * WIP list: APPROVED orders of the signed-in merchant (company + user), each with the
   * P.O. lines shown in the current list (P.O. ref. no., qty, Pcs. / Set, shipment date).
   */
  list(user: SessionUser) {
    return this.db.run(user.companyId, async (tx) => {
      const orders = await tx.enquiry.findMany({
        where: { ...visibleTo(user), orderStatus: ORDER_STATUS.APPROVED },
        select: enquiryListSelect,
        orderBy: { dateAuthorized: 'desc' },
      });
      const sheets = await tx.orderEntrySheet.findMany({
        where: { companyId: user.companyId, enquiryId: { in: orders.map((o) => o.id) }, subTab: { in: ['po_size', 'po_delivery'] } },
        select: { enquiryId: true, subTab: true, rows: true, updatedAt: true },
      });
      return orders.map((o) => {
        const mine = sheets.filter((s) => s.enquiryId === o.id);
        const poRows = asRows(mine.find((s) => s.subTab === 'po_size')?.rows);
        const delivery = asRows(mine.find((s) => s.subTab === 'po_delivery')?.rows);
        const pos = new Map<string, { poNo: string; qty: number; pcsOrSet: string; shipmentDate: string }>();
        for (const r of poRows) {
          const poNo = String(r.poNo ?? '');
          if (!poNo) continue;
          const line = pos.get(poNo) ?? { poNo, qty: 0, pcsOrSet: String(r.pcsOrSet ?? ''), shipmentDate: '' };
          line.qty += typeof r.poQty === 'number' ? r.poQty : 0;
          line.shipmentDate ||= String(delivery.find((d) => d.poNo === poNo && d.shipmentDate)?.shipmentDate ?? '');
          pos.set(poNo, line);
        }
        const lastUpdate = mine.reduce<Date | null>((a, s) => (!a || s.updatedAt > a ? s.updatedAt : a), null);
        return { ...o, poSummary: [...pos.values()], recentUpdate: lastUpdate ?? o.dateAuthorized };
      });
    });
  }

  /** ORDER DETAILS block + Total Order Qty. / UOM, saved with the page's UPDATE button. */
  async saveDetails(user: SessionUser, id: number, input: OrderDetailsInput) {
    return this.db.run(user.companyId, async (tx) => {
      const enquiry = await this.findOrder(tx, user, id);
      this.assertCanEdit(user, enquiry.merchantId);
      return tx.enquiry.update({
        where: { id },
        data: {
          orderQty: input.orderQty,
          pcsOrSet: input.pcsOrSet,
          season: input.season || null,
          className: input.className || null,
          diviDept: input.diviDept || null,
          subClass: input.subClass || null,
        },
        select: enquiryListSelect,
      });
    });
  }

  /** Remarks under the Combo / Colour sub-tab (its own SAVE, as in the current page). */
  async saveOeRemarks(user: SessionUser, id: number, remarks: string) {
    return this.db.run(user.companyId, async (tx) => {
      const enquiry = await this.findOrder(tx, user, id);
      this.assertCanEdit(user, enquiry.merchantId);
      return tx.enquiry.update({ where: { id }, data: { oeRemarks: remarks || null }, select: { oeRemarks: true, updatedAt: true } });
    });
  }

  /** The order page: header, every order-entry sub-tab and the CAD tab, read back from the database. */
  async order(user: SessionUser, id: number) {
    return this.db.run(user.companyId, async (tx) => {
      const enquiry = await this.findOrder(tx, user, id);
      // companies has no RLS; read by the session's company id only.
      const company = await tx.company.findUniqueOrThrow({
        where: { id: user.companyId },
        select: { name: true, address: true, city: true, pincode: true, state: true, country: true, gstNo: true, ieCode: true },
      });
      const [sheets, cad] = await Promise.all([
        tx.orderEntrySheet.findMany({ where: { enquiryId: id, companyId: user.companyId }, select: { subTab: true, rows: true, updatedAt: true } }),
        tx.cadRequirement.findUnique({ where: { enquiryId: id }, select: { rows: true, remarks: true, updatedAt: true } }),
      ]);
      return {
        enquiry,
        company,
        sheets: Object.fromEntries(sheets.map((s) => [s.subTab, { rows: asRows(s.rows), updatedAt: s.updatedAt }])),
        cad: cad ? { rows: asRows(cad.rows), remarks: cad.remarks ?? '', updatedAt: cad.updatedAt } : null,
        canEdit: this.canEdit(user, enquiry.merchantId),
      };
    });
  }

  async saveSheet(user: SessionUser, id: number, tab: SubTab, rawRows: unknown[]) {
    return this.db.run(user.companyId, async (tx) => {
      const enquiry = await this.findOrder(tx, user, id);
      this.assertCanEdit(user, enquiry.merchantId);
      const ctx = await this.context(tx, id, user.companyId);
      const comboRows = tab === 'combo_colour' ? (rawRows as GridRow[]) : ctx.comboRows;
      const options = orderOptions(enquiry.sizes, comboRows, ctx.poRows);

      if ((tab === 'component_intake' || tab === 'po_delivery') && ctx.poRows.length === 0) {
        throw new BadRequestException('Save the P.O. & Size Wise Qty. Break-up first.');
      }
      if (tab === 'po_size' && ctx.comboRows.length === 0) {
        throw new BadRequestException('Save the Combo / Colour Wise Qty. Break-up first.');
      }

      const checked = validateRows(tab, rawRows, options);
      if (!checked.ok) throw new BadRequestException({ message: 'Please correct the grid.', errors: checked.errors.map((message) => ({ path: '', message })) });

      // Read-only columns are always recalculated here; generated sub-tabs are rebuilt
      // from the saved P.O. break-up, keeping only the cells the merchant may edit.
      const rows = tab === 'component_intake' || tab === 'po_delivery'
        ? buildGeneratedRows(tab, ctx.poRows, checked.rows)
        : deriveRows(tab, checked.rows, comboRows);

      const saved = await tx.orderEntrySheet.upsert({
        where: { enquiryId_subTab: { enquiryId: id, subTab: tab } },
        create: { companyId: user.companyId, enquiryId: id, subTab: tab, rows: rows as Prisma.InputJsonValue, updatedById: user.id },
        update: { rows: rows as Prisma.InputJsonValue, updatedById: user.id },
        select: { subTab: true, rows: true, updatedAt: true },
      });
      return { subTab: saved.subTab, rows: asRows(saved.rows), updatedAt: saved.updatedAt };
    });
  }

  /** CAD tab SAVE. Saves the grid and remarks only; no CAD request is raised. */
  async saveCad(user: SessionUser, id: number, rawRows: unknown[], remarks: string) {
    return this.db.run(user.companyId, async (tx) => {
      const enquiry = await this.findOrder(tx, user, id);
      this.assertCanEdit(user, enquiry.merchantId);
      const ctx = await this.context(tx, id, user.companyId);
      const checked = validateRows('cad', rawRows, orderOptions(enquiry.sizes, ctx.comboRows, ctx.poRows));
      if (!checked.ok) throw new BadRequestException({ message: 'Please correct the grid.', errors: checked.errors.map((message) => ({ path: '', message })) });

      // "Actual Date & Time" is filled by the CAD department later, never by the merchant.
      const rows = checked.rows.map((r) => ({ ...r, actualDateTime: '' }));
      const saved = await tx.cadRequirement.upsert({
        where: { enquiryId: id },
        create: { companyId: user.companyId, enquiryId: id, rows: rows as Prisma.InputJsonValue, remarks: remarks || null, updatedById: user.id },
        update: { rows: rows as Prisma.InputJsonValue, remarks: remarks || null, updatedById: user.id },
        select: { rows: true, remarks: true, updatedAt: true },
      });
      return { rows: asRows(saved.rows), remarks: saved.remarks ?? '', updatedAt: saved.updatedAt };
    });
  }

  private async findOrder(tx: Tx, user: SessionUser, id: number) {
    const enquiry = await tx.enquiry.findFirst({
      where: { ...visibleTo(user), id, orderStatus: ORDER_STATUS.APPROVED },
      select: enquiryListSelect,
    });
    if (!enquiry) throw new NotFoundException('Order not found on your WIP list.');
    return enquiry;
  }

  private async context(tx: Tx, id: number, companyId: number) {
    const sheets = await tx.orderEntrySheet.findMany({
      where: { enquiryId: id, companyId, subTab: { in: ['combo_colour', 'po_size'] } },
      select: { subTab: true, rows: true },
    });
    const get = (t: string) => asRows(sheets.find((s) => s.subTab === t)?.rows);
    return { comboRows: get('combo_colour'), poRows: get('po_size') };
  }

  /** Merchant only (user type 3), and only on their own order. Everyone else is read only. */
  private canEdit(user: SessionUser, merchantId: number) {
    return user.userType === USER_TYPE_MERCHANT && user.id === merchantId;
  }

  private assertCanEdit(user: SessionUser, merchantId: number) {
    if (!this.canEdit(user, merchantId)) throw new ForbiddenException('Only the order\'s merchant can save this tab.');
  }
}

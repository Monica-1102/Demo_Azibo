import { Controller, Get, Module } from '@nestjs/common';
import {
  COMPONENTS, COST_HEADS, CURRENCIES, ENQUIRY_TYPES, ISR_IOR, MODE_OF_ENQUIRY, ORDER_STATUS_LABEL, PCS_OR_SET,
  PRICE_QUOTED_FOR, SIZES, UOMS,
} from '../../shared/constants';

const toOptions = (rec: Record<number, string>) => Object.entries(rec).map(([value, label]) => ({ value: Number(value), label }));
import { CurrentUser, type SessionUser } from '../auth/auth.decorators';
import { TenantDb } from '../db/tenant-db.service';

/** Dropdown values for the enquiry and pre-costing screens (company masters + fixed lists). */
@Controller('masters')
export class MastersController {
  constructor(private readonly db: TenantDb) {}

  @Get()
  async all(@CurrentUser() user: SessionUser) {
    const { buyers, brands } = await this.db.run(user.companyId, async (tx) => ({
      buyers: await tx.buyer.findMany({
        where: { companyId: user.companyId, isActive: true },
        select: { id: true, name: true, country: true },
        orderBy: { name: 'asc' },
      }),
      brands: await tx.brand.findMany({
        where: { companyId: user.companyId, isActive: true },
        select: { id: true, name: true, buyerId: true },
        orderBy: { name: 'asc' },
      }),
    }));
    return {
      buyers,
      brands,
      enquiryTypes: ENQUIRY_TYPES,
      isrIor: toOptions(ISR_IOR),
      pcsOrSet: toOptions(PCS_OR_SET),
      modeOfEnquiry: toOptions(MODE_OF_ENQUIRY),
      priceQuotedFor: toOptions(PRICE_QUOTED_FOR),
      orderStatus: ORDER_STATUS_LABEL,
      currencies: CURRENCIES,
      sizes: SIZES,
      components: COMPONENTS,
      costHeads: COST_HEADS,
      uoms: UOMS,
    };
  }
}

@Module({ controllers: [MastersController] })
export class MastersModule {}

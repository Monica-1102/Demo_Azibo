import { BadRequestException, Body, Controller, Get, Module, Param, ParseIntPipe, PipeTransform, Put } from '@nestjs/common';
import { USER_TYPE_MERCHANT } from '../../shared/constants';
import { saveCadSchema, saveGridSchema, SUB_TABS, type SubTab } from '../../shared/grids';
import { oeRemarksSchema, orderDetailsSchema, type OrderDetailsInput } from '../../shared/schemas';
import { CurrentUser, Roles, type SessionUser } from '../auth/auth.decorators';
import { ZodPipe } from '../common/zod.pipe';
import { WipService } from './wip.service';

class SubTabPipe implements PipeTransform<string, SubTab> {
  transform(value: string): SubTab {
    if (!(SUB_TABS as readonly string[]).includes(value)) throw new BadRequestException('Unknown order entry tab.');
    return value as SubTab;
  }
}

@Controller()
export class WipController {
  constructor(private readonly wip: WipService) {}

  @Get('wip')
  list(@CurrentUser() user: SessionUser) {
    return this.wip.list(user);
  }

  @Get('orders/:id')
  order(@CurrentUser() user: SessionUser, @Param('id', ParseIntPipe) id: number) {
    return this.wip.order(user, id);
  }

  @Roles(USER_TYPE_MERCHANT)
  @Put('orders/:id/order-entry/:tab')
  saveSheet(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('tab', SubTabPipe) tab: SubTab,
    @Body(new ZodPipe(saveGridSchema)) body: { rows: unknown[] },
  ) {
    return this.wip.saveSheet(user, id, tab, body.rows);
  }

  @Roles(USER_TYPE_MERCHANT)
  @Put('orders/:id/details')
  saveDetails(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodPipe(orderDetailsSchema)) body: OrderDetailsInput,
  ) {
    return this.wip.saveDetails(user, id, body);
  }

  @Roles(USER_TYPE_MERCHANT)
  @Put('orders/:id/order-entry-remarks')
  saveOeRemarks(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodPipe(oeRemarksSchema)) body: { remarks: string },
  ) {
    return this.wip.saveOeRemarks(user, id, body.remarks);
  }

  @Roles(USER_TYPE_MERCHANT)
  @Put('orders/:id/cad')
  saveCad(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodPipe(saveCadSchema)) body: { rows: unknown[]; remarks: string },
  ) {
    return this.wip.saveCad(user, id, body.rows, body.remarks);
  }
}

@Module({ controllers: [WipController], providers: [WipService] })
export class WipModule {}

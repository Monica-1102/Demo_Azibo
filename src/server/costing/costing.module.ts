import { Body, Controller, Get, Module, Param, ParseIntPipe, Put } from '@nestjs/common';
import { USER_TYPE_MERCHANT } from '../../shared/constants';
import { preCostingSchema, type PreCostingInput } from '../../shared/schemas';
import { CurrentUser, Roles, type SessionUser } from '../auth/auth.decorators';
import { ZodPipe } from '../common/zod.pipe';
import { AuthorizationService } from './authorization.service';
import { CostingService } from './costing.service';

@Controller('precosting')
export class CostingController {
  constructor(private readonly costing: CostingService) {}

  @Get(':enquiryId')
  get(@CurrentUser() user: SessionUser, @Param('enquiryId', ParseIntPipe) enquiryId: number) {
    return this.costing.get(user, enquiryId);
  }

  @Roles(USER_TYPE_MERCHANT)
  @Put(':enquiryId')
  save(
    @CurrentUser() user: SessionUser,
    @Param('enquiryId', ParseIntPipe) enquiryId: number,
    @Body(new ZodPipe(preCostingSchema)) body: PreCostingInput,
  ) {
    return this.costing.save(user, enquiryId, body);
  }
}

@Module({
  controllers: [CostingController],
  providers: [CostingService, AuthorizationService],
})
export class CostingModule {}

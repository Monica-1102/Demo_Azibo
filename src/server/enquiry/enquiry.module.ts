import { Body, Controller, Get, Module, Param, ParseIntPipe, Post } from '@nestjs/common';
import { USER_TYPE_MERCHANT } from '../../shared/constants';
import { enquirySchema, type EnquiryInput } from '../../shared/schemas';
import { CurrentUser, Roles, type SessionUser } from '../auth/auth.decorators';
import { ZodPipe } from '../common/zod.pipe';
import { EnquiryService } from './enquiry.service';

@Controller('enquiries')
export class EnquiryController {
  constructor(private readonly enquiries: EnquiryService) {}

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.enquiries.list(user);
  }

  @Get(':id')
  get(@CurrentUser() user: SessionUser, @Param('id', ParseIntPipe) id: number) {
    return this.enquiries.get(user, id);
  }

  @Roles(USER_TYPE_MERCHANT)
  @Post()
  create(@CurrentUser() user: SessionUser, @Body(new ZodPipe(enquirySchema)) body: EnquiryInput) {
    return this.enquiries.create(user, body);
  }
}

@Module({
  controllers: [EnquiryController],
  providers: [EnquiryService],
  exports: [EnquiryService],
})
export class EnquiryModule {}

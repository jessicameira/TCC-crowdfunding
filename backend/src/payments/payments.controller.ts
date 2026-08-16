import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.findById(id);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(@Body() payload: unknown) {
    await this.paymentsService.processWebhookPayload(payload);
    return { received: true };
  }

  @Post(':id/refund')
  refund(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.refund(id);
  }
}

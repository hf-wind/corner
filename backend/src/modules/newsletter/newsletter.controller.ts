import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NewsletterService } from './newsletter.service';
import {
  AdminCreateSubscriberDto,
  NewsletterTokenDto,
  SubscribeDto,
  UpdateNewsletterConfigDto,
  UpdateSubscriberStatusDto,
} from './dto/newsletter.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('newsletter')
export class NewsletterController {
  constructor(private newsletter: NewsletterService) {}

  @Post('subscribe')
  subscribe(@Body() dto: SubscribeDto) {
    return this.newsletter.subscribe(dto.email);
  }

  @Post('confirm')
  confirm(@Body() dto: NewsletterTokenDto) {
    return this.newsletter.confirm(dto.token);
  }

  @Post('unsubscribe')
  unsubscribe(@Body() dto: NewsletterTokenDto) {
    return this.newsletter.unsubscribe(dto.token);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('admin/config')
  getConfig() {
    return this.newsletter.getConfig();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Put('admin/config')
  updateConfig(@Body() dto: UpdateNewsletterConfigDto) {
    return this.newsletter.updateConfig(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('admin/subscribers')
  adminList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
  ) {
    return this.newsletter.adminList({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      q,
    });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post('admin/subscribers')
  adminCreate(@Body() dto: AdminCreateSubscriberDto) {
    return this.newsletter.adminCreate(dto.email);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Patch('admin/subscribers/:id')
  adminUpdateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriberStatusDto,
  ) {
    return this.newsletter.adminUpdateStatus(id, dto.status);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Delete('admin/subscribers/:id')
  adminDelete(@Param('id') id: string) {
    return this.newsletter.adminDelete(id);
  }
}

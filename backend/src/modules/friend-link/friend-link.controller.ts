import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FriendLinkService } from './friend-link.service';
import { CreateFriendApplicationDto } from './dto/create-friend-application.dto';
import { SendRemoveCodeDto, VerifyRemoveDto } from './dto/remove-friend.dto';

@Controller('friend-link')
export class FriendLinkController {
  constructor(private friendLinkService: FriendLinkService) {}

  @Get('my-site')
  getMySiteInfo() {
    return this.friendLinkService.getMySiteInfo();
  }

  @Post('apply')
  createApplication(@Body() dto: CreateFriendApplicationDto) {
    return this.friendLinkService.createApplication(dto);
  }

  @Post('inspect-site')
  inspectSite(@Body('url') url: string) {
    return this.friendLinkService.inspectSite(url);
  }

  @Post('remove/send-code')
  sendRemoveCode(@Body() dto: SendRemoveCodeDto) {
    return this.friendLinkService.sendRemoveCode(dto.email);
  }

  @Post('remove/verify')
  verifyAndRemove(@Body() dto: VerifyRemoveDto) {
    return this.friendLinkService.verifyAndRemove(dto.email, dto.code);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('applications')
  getApplications(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.friendLinkService.getApplications({
      page: Math.max(1, Math.min(500, page ? parseInt(page) || 1 : 1)),
      limit: Math.max(1, Math.min(100, limit ? parseInt(limit) || 20 : 20)),
      status,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('applications/:id')
  getApplication(@Param('id') id: string) {
    return this.friendLinkService.getApplication(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('applications/:id/approve')
  approveApplication(@Param('id') id: string) {
    return this.friendLinkService.approveApplication(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('applications/:id/reject')
  rejectApplication(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.friendLinkService.rejectApplication(id, reason);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('applications/:id')
  deleteApplication(@Param('id') id: string) {
    return this.friendLinkService.deleteApplication(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put('my-site')
  updateMySiteInfo(@Body() data: Record<string, any>) {
    return this.friendLinkService.updateMySiteInfo(data);
  }
}

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FriendLinkService } from './friend-link.service';
import { CreateFriendApplicationDto } from './dto/create-friend-application.dto';
import { SendRemoveCodeDto, VerifyRemoveDto } from './dto/remove-friend.dto';
import {
  InspectSiteDto,
  UpdateMySiteInfoDto,
} from './dto/friend-link-request.dto';
import { OptionalReasonDto } from '../../common/dto/request-body.dto';

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
  inspectSite(@Body() dto: InspectSiteDto) {
    return this.friendLinkService.inspectSite(dto.url);
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
    @Query('search') search?: string,
  ) {
    return this.friendLinkService.getApplications({
      page: Math.max(1, Math.min(500, page ? parseInt(page) || 1 : 1)),
      limit: Math.max(1, Math.min(100, limit ? parseInt(limit) || 10 : 10)),
      status,
      search,
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
  rejectApplication(@Param('id') id: string, @Body() dto: OptionalReasonDto) {
    return this.friendLinkService.rejectApplication(id, dto.reason);
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
  updateMySiteInfo(@Body() dto: UpdateMySiteInfoDto) {
    return this.friendLinkService.updateMySiteInfo({ ...dto });
  }
}

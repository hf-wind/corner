import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { VisitorService } from './visitor.service';

class IdentifyDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  screen?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  locale?: string;
}

class CreateMessageDto {
  @IsString()
  @MaxLength(200)
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  nickname?: string;
}

class ThrowBottleDto {
  @IsString()
  @MaxLength(200)
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  nickname?: string;

  @IsOptional()
  @IsString()
  relayToId?: string;
}

class TrackEventsDto {
  @IsArray()
  events: Array<Record<string, unknown>>;
}

class ModerateMessageDto {
  @IsIn(['approved', 'pending', 'rejected'])
  status: string;
}

class BanDto {
  @IsIn(['true', 'false'])
  banned: 'true' | 'false';
}

@Controller('visitor')
export class VisitorController {
  constructor(private readonly visitor: VisitorService) {}

  @Post('identify')
  identify(@Req() req: any, @Body() dto: IdentifyDto) {
    return this.visitor.identify(req, dto);
  }

  @Get('recent')
  recent(@Query('limit') limit?: string) {
    return this.visitor.recentVisitors(Number(limit) || 3);
  }

  @Post('events')
  trackEvents(@Req() req: any, @Body() dto: TrackEventsDto) {
    return this.visitor.trackEvents(req, dto.events);
  }

  /* ---- 留言墙 ---- */

  @Get('messages')
  messages(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.visitor.listMessages(Number(page) || 1, Number(limit) || 30);
  }

  @Post('messages')
  createMessage(@Req() req: any, @Body() dto: CreateMessageDto) {
    return this.visitor.createMessage(req, dto);
  }

  /* ---- 漂流瓶 ---- */

  @Get('bottle/quota')
  bottleQuota(@Req() req: any) {
    return this.visitor.bottleQuota(req);
  }

  @Post('bottle/throw')
  throwBottle(@Req() req: any, @Body() dto: ThrowBottleDto) {
    return this.visitor.throwBottle(req, dto);
  }

  @Post('bottle/fish')
  fishBottle(@Req() req: any) {
    return this.visitor.fishBottle(req);
  }

  @Post('bottle/:id/release')
  releaseBottle(@Req() req: any, @Param('id') id: string) {
    return this.visitor.releaseBottle(req, id);
  }

  /* ---- 后台管理 ---- */

  @Get('admin/messages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  adminMessages(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.visitor.adminMessages({ type, status, q, page: Number(page), limit: Number(limit) });
  }

  @Put('admin/messages/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  moderate(@Param('id') id: string, @Body() dto: ModerateMessageDto) {
    return this.visitor.moderateMessage(id, dto.status);
  }

  @Delete('admin/messages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  removeMessage(@Param('id') id: string) {
    return this.visitor.removeMessage(id);
  }

  @Get('admin/profiles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  adminProfiles(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.visitor.adminProfiles({ q, page: Number(page), limit: Number(limit) });
  }

  @Put('admin/profiles/:id/ban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  setBanned(@Param('id') id: string, @Body() dto: BanDto) {
    return this.visitor.setBanned(id, dto.banned === 'true');
  }
}

import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TurnstileService } from '../auth/turnstile.service';
import { VisitorService, VisitorActor } from './visitor.service';
import { OptionalReasonDto } from '../../common/dto/request-body.dto';
import {
  CreateVisitorBottleDto,
  CreateVisitorMessageDto,
  ReplyVisitorBottleDto,
  SetVisitorNicknameDto,
  TrackVisitDto,
} from './dto/create-visitor-message.dto';

@Controller('visitor')
export class VisitorController {
  constructor(
    private readonly visitorService: VisitorService,
    private readonly turnstile: TurnstileService,
  ) {}

  @Get('new-id')
  newVisitorId() {
    return { visitorId: this.visitorService.newVisitorId() };
  }

  @Post('identify')
  @HttpCode(200)
  async identify(
    @Req() req: { ip: string },
    @Headers('x-visitor-id') visitorId: string,
    @Body() dto: SetVisitorNicknameDto,
  ) {
    await this.turnstile.verify(dto.turnstileToken, req.ip);
    const hash = this.visitorService.resolveVisitorId({
      headers: { 'x-visitor-id': visitorId },
      ip: req.ip,
    });
    return this.visitorService.identify(
      { headers: { 'x-visitor-id': visitorId }, ip: req.ip },
      hash,
      dto.nickname,
      dto.email,
    );
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('track')
  @HttpCode(200)
  async trackVisit(
    @Req() req: { ip: string; user?: { id?: string } },
    @Headers('x-visitor-id') visitorId: string,
    @Body() dto: TrackVisitDto,
  ) {
    const hash = this.visitorService.resolveVisitorId({
      headers: { 'x-visitor-id': visitorId },
      ip: req.ip,
    });
    return this.visitorService.trackVisit(
      { headers: { 'x-visitor-id': visitorId }, ip: req.ip },
      hash,
      dto,
      req.user?.id ?? null,
    );
  }

  @Get('messages')
  async listMessages(
    @Query('type') type: string = 'message',
    @Query('page') page = '1',
  ) {
    return this.visitorService.listMessages(
      type === 'bottle' ? 'bottle' : 'message',
      Math.max(1, Number(page) || 1),
    );
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('messages')
  async createMessage(
    @Req() req: { ip: string; user?: { id?: string; username?: string } },
    @Headers('x-visitor-id') visitorId: string,
    @Body() dto: CreateVisitorMessageDto,
  ) {
    const actor: VisitorActor = req.user?.id
      ? { userId: req.user.id, username: req.user.username ?? '' }
      : null;
    const visitorIdHash =
      this.visitorService.resolveVisitorIdOptional(visitorId);
    return this.visitorService.createMessageEntry(
      { headers: { 'x-visitor-id': visitorId }, ip: req.ip },
      actor,
      visitorIdHash,
      dto.content,
    );
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('bottles')
  async throwBottle(
    @Req() req: { ip: string; user?: { id?: string; username?: string } },
    @Headers('x-visitor-id') visitorId: string,
    @Body() dto: CreateVisitorBottleDto,
  ) {
    const actor: VisitorActor = req.user?.id
      ? { userId: req.user.id, username: req.user.username ?? '' }
      : null;
    const visitorIdHash =
      this.visitorService.resolveVisitorIdOptional(visitorId);
    return this.visitorService.throwBottle(
      { headers: { 'x-visitor-id': visitorId }, ip: req.ip },
      actor,
      visitorIdHash,
      dto.content,
      dto.parentId,
    );
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('bottles/:id/fish')
  @HttpCode(200)
  async fishBottle(
    @Req() req: { ip: string; user?: { id?: string; username?: string } },
    @Headers('x-visitor-id') visitorId: string,
    @Param('id') id: string,
  ) {
    const actor: VisitorActor = req.user?.id
      ? { userId: req.user.id, username: req.user.username ?? '' }
      : null;
    const visitorIdHash =
      this.visitorService.resolveVisitorIdOptional(visitorId);
    return this.visitorService.fishBottle(
      { headers: { 'x-visitor-id': visitorId }, ip: req.ip },
      actor,
      visitorIdHash,
      id,
    );
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('bottles/:id/reply')
  @HttpCode(200)
  async replyBottle(
    @Req() req: { ip: string; user?: { id?: string; username?: string } },
    @Headers('x-visitor-id') visitorId: string,
    @Param('id') id: string,
    @Body() dto: ReplyVisitorBottleDto,
  ) {
    const actor: VisitorActor = req.user?.id
      ? { userId: req.user.id, username: req.user.username ?? '' }
      : null;
    const visitorIdHash =
      this.visitorService.resolveVisitorIdOptional(visitorId);
    return this.visitorService.replyBottle(
      { headers: { 'x-visitor-id': visitorId }, ip: req.ip },
      actor,
      visitorIdHash,
      id,
      dto.content,
    );
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('bottles/peek')
  async peekBottles(
    @Query('limit') limit = '8',
    @Req()
    req: {
      headers?: { 'x-visitor-id'?: string | string[] | undefined };
      user?: { id?: string };
    },
  ) {
    const raw = req.headers?.['x-visitor-id'];
    const visitorId = Array.isArray(raw) ? raw[0] : raw;
    const visitorIdHash = this.visitorService.resolveVisitorIdOptional(
      visitorId ?? '',
    );
    return this.visitorService.peekBottles(
      Math.min(8, Math.max(1, Number(limit) || 8)),
      visitorIdHash,
      req.user?.id ?? null,
    );
  }

  @Get('wall')
  async wall() {
    return this.visitorService.wall();
  }

  @Get('me')
  async me(@Headers('x-visitor-id') visitorId: string) {
    const hash = this.visitorService.resolveVisitorId({
      headers: { 'x-visitor-id': visitorId },
    });
    return this.visitorService.me(hash);
  }

  @Get('recent')
  async recentVisits() {
    return this.visitorService.recentVisits();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('admin/stats')
  adminStats() {
    return this.visitorService.adminStats();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('admin/messages')
  adminMessages(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.visitorService.adminMessages({
      status,
      type,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post('admin/messages/:id/approve')
  async approveMessage(@Param('id') id: string) {
    return this.visitorService.reviewMessage(id, 'approve');
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post('admin/messages/:id/reject')
  async rejectMessage(@Param('id') id: string, @Body() dto: OptionalReasonDto) {
    return this.visitorService.reviewMessage(id, 'reject', dto?.reason);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('admin/profiles')
  adminProfiles(
    @Query('keyword') keyword?: string,
    @Query('banned') banned?: string,
    @Query('type') type?: 'user' | 'registered' | 'anonymous',
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.visitorService.adminProfiles({
      keyword,
      banned,
      type,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post('admin/profiles/:id/ban')
  async banProfile(@Param('id') id: string) {
    return this.visitorService.setBan(id, true);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post('admin/profiles/:id/unban')
  async unbanProfile(@Param('id') id: string) {
    return this.visitorService.setBan(id, false);
  }
}

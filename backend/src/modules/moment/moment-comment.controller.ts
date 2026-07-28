import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { MomentCommentService } from './moment-comment.service';
import { CreateMomentCommentDto } from './dto/create-moment-comment.dto';

@Controller('moment-comments')
export class MomentCommentController {
  constructor(private comment: MomentCommentService) {}

  @Get()
  findAll(@Query() query: { page?: string; limit?: string; status?: string }) {
    return this.comment.findAll({
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 20,
      status: query.status,
    });
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('moment/:momentId')
  findByMoment(
    @Param('momentId') momentId: string,
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('replyLimit') replyLimit?: string,
  ) {
    return this.comment.findByMoment(
      momentId,
      req.user?.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 5,
      replyLimit ? parseInt(replyLimit, 10) : 3,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/status')
  findStatus(@Param('id') id: string, @Req() req: any) {
    return this.comment.findStatus(id, req.user.id);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/replies')
  findReplies(
    @Param('id') id: string,
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.comment.findReplies(
      id,
      req.user?.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 3,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() dto: CreateMomentCommentDto, @Req() req: any) {
    return this.comment.create(dto, req.user.id, req.user.username);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/like')
  toggleLike(@Param('id') id: string, @Req() req: any) {
    return this.comment.toggleLike(id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.comment.approve(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/reject')
  reject(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.comment.reject(id, reason);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.comment.remove(id);
  }
}

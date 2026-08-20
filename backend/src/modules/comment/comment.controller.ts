import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OptionalReasonDto } from '../../common/dto/request-body.dto';

@Controller('comments')
export class CommentController {
  constructor(private comment: CommentService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get()
  findAll(
    @Query()
    query: { page?: string; limit?: string; status?: string; keyword?: string },
  ) {
    return this.comment.findAll({
      page: Math.max(
        1,
        Math.min(500, query.page ? parseInt(query.page) || 1 : 1),
      ),
      limit: Math.max(
        1,
        Math.min(100, query.limit ? parseInt(query.limit) || 20 : 20),
      ),
      status: query.status,
      keyword: query.keyword,
    });
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('post/:postId')
  findByPost(
    @Param('postId') postId: string,
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('replyLimit') replyLimit?: string,
  ) {
    const userId = req.user?.id;
    return this.comment.findByPost(
      postId,
      userId,
      Math.max(1, Math.min(500, page ? parseInt(page) || 1 : 1)),
      Math.max(1, Math.min(50, limit ? parseInt(limit) || 10 : 10)),
      Math.max(1, Math.min(20, replyLimit ? parseInt(replyLimit) || 3 : 3)),
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
    const userId = req.user?.id;
    return this.comment.findReplies(
      id,
      userId,
      Math.max(1, Math.min(500, page ? parseInt(page) || 1 : 1)),
      Math.max(1, Math.min(50, limit ? parseInt(limit) || 3 : 3)),
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() dto: CreateCommentDto, @Req() req: any) {
    return this.comment.create(dto, req.user.id, req.user.username);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/like')
  toggleLike(@Param('id') id: string, @Req() req: any) {
    return this.comment.toggleLike(id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.comment.approve(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() dto: OptionalReasonDto) {
    return this.comment.reject(id, dto.reason);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.comment.remove(id);
  }
}

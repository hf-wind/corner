import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('comments')
export class CommentController {
  constructor(private comment: CommentService) {}

  @Get()
  findAll(@Query() query: { page?: string; limit?: string; status?: string }) {
    return this.comment.findAll({
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 20,
      status: query.status,
    });
  }

  @Get('post/:postId')
  findByPost(@Param('postId') postId: string) {
    return this.comment.findByPost(postId);
  }

  @Post()
  create(@Body() dto: CreateCommentDto) {
    return this.comment.create(dto);
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

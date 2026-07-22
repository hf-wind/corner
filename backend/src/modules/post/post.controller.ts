import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostQueryDto } from './dto/post-query.dto';

@Controller('posts')
export class PostController {
  constructor(private post: PostService) {}

  @Get()
  findAll(@Query() query: PostQueryDto) {
    return this.post.findAll(query);
  }

  @Get('featured')
  findFeatured() {
    return this.post.findFeatured();
  }

  @Get('archive')
  findArchive() {
    return this.post.findArchive();
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.post.findBySlug(slug);
  }

  @Get(':slug/adjacent')
  findAdjacent(@Param('slug') slug: string) {
    return this.post.findAdjacent(slug);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() dto: CreatePostDto, @Req() req: any) {
    return this.post.create(dto, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':slug')
  update(@Param('slug') slug: string, @Body() dto: UpdatePostDto) {
    return this.post.update(slug, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':slug')
  remove(@Param('slug') slug: string) {
    return this.post.remove(slug);
  }
}

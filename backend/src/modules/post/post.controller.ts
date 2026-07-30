import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostQueryDto } from './dto/post-query.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

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

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get(':slug/preview')
  preview(@Param('slug') slug: string) {
    return this.post.preview(slug);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post(':slug/publish')
  publish(@Param('slug') slug: string) {
    return this.post.publish(slug);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.post.findBySlug(slug);
  }

  @Get(':slug/adjacent')
  findAdjacent(@Param('slug') slug: string) {
    return this.post.findAdjacent(slug);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreatePostDto, @Req() req: any) {
    return this.post.create(dto, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Put(':slug')
  update(@Param('slug') slug: string, @Body() dto: UpdatePostDto) {
    return this.post.update(slug, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Delete(':slug')
  remove(@Param('slug') slug: string) {
    return this.post.remove(slug);
  }
}

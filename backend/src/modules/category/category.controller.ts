import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoryController {
  constructor(private cat: CategoryService) {}

  @Get()
  findAll() {
    return this.cat.findAll();
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.cat.findBySlug(slug);
  }

  @Get(':slug/posts')
  findPosts(
    @Param('slug') slug: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.cat.findPosts(slug, page ?? 1, limit ?? 20);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':slug/posts')
  assignPosts(@Param('slug') slug: string, @Body('postIds') postIds: string[]) {
    return this.cat.assignPosts(slug, postIds);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.cat.create(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':slug')
  update(@Param('slug') slug: string, @Body() dto: UpdateCategoryDto) {
    return this.cat.update(slug, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':slug')
  remove(@Param('slug') slug: string) {
    return this.cat.remove(slug);
  }
}

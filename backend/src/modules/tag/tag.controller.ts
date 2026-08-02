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
import { AuthGuard } from '@nestjs/passport';
import { TagService } from './tag.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AssignPostIdsDto } from '../../common/dto/request-body.dto';

@Controller('tags')
export class TagController {
  constructor(private tag: TagService) {}

  @Get()
  findAll() {
    return this.tag.findAll();
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.tag.findBySlug(slug);
  }

  @Get(':slug/posts')
  findPosts(
    @Param('slug') slug: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.tag.findPosts(slug, page ?? 1, limit ?? 20);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post(':slug/posts')
  assignPosts(@Param('slug') slug: string, @Body() dto: AssignPostIdsDto) {
    return this.tag.assignPosts(slug, dto.postIds);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateTagDto) {
    return this.tag.create(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Put(':slug')
  update(@Param('slug') slug: string, @Body() dto: UpdateTagDto) {
    return this.tag.update(slug, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Delete(':slug')
  remove(@Param('slug') slug: string) {
    return this.tag.remove(slug);
  }
}

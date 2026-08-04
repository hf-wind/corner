import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateLibraryItemDto } from './dto/create-library-item.dto';
import { UpdateLibraryItemDto } from './dto/update-library-item.dto';
import { LibraryService } from './library.service';
import { LookupLibraryItemDto } from './dto/lookup-library-item.dto';

@Controller('library')
export class LibraryController {
  constructor(private readonly library: LibraryService) {}

  @Get()
  findPublished(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
  ) {
    return this.library.findAll({ page, limit, type, search, sort, admin: false });
  }

  @Get('meta')
  getMeta() {
    return this.library.getMeta();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin')
  findAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('needsPublish') needsPublish?: string,
  ) {
    return this.library.findAll({ page, limit, type, status, search, needsPublish: needsPublish === 'true', admin: true });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/:id')
  findAdminOne(@Param('id') id: string) {
    return this.library.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('ai/lookup')
  lookup(@Body() dto: LookupLibraryItemDto) {
    return this.library.lookupMetadata(dto.type, dto.title);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.library.findPublishedBySlug(slug);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateLibraryItemDto) {
    return this.library.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLibraryItemDto) {
    return this.library.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.library.publish(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/private')
  makePrivate(@Param('id') id: string) {
    return this.library.makePrivate(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.library.remove(id);
  }
}

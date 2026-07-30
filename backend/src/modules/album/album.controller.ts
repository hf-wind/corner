import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AlbumService } from './album.service';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { AlbumFeatureGuard } from './album-feature.guard';

@Controller('albums')
@UseGuards(AlbumFeatureGuard)
export class AlbumController {
  constructor(private album: AlbumService) {}

  @Get()
  findPublic(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('place') place?: string,
    @Query('year') year?: string,
  ) {
    return this.album.findPublic({ page, limit, place, year });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('admin')
  findAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.album.findAdmin({ page, limit, status, search });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('admin/:id')
  findAdminOne(@Param('id') id: string) {
    return this.album.findAdminOne(id);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.album.findPublishedBySlug(slug);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateAlbumDto, @Req() req: any) {
    return this.album.create(dto, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAlbumDto) {
    return this.album.update(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.album.publish(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post(':id/unpublish')
  unpublish(@Param('id') id: string) {
    return this.album.unpublish(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post(':id/private')
  makePrivate(@Param('id') id: string) {
    return this.album.makePrivate(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.album.remove(id);
  }
}

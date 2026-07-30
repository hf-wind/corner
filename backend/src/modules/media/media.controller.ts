import { BadRequestException, Controller, ForbiddenException, Get, Post, Put, Delete, Param, Query, UseGuards, UseInterceptors, UploadedFile, Req, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MediaService } from './media.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MediaMetadataService } from './media-metadata.service';

@Controller('media')
export class MediaController {
  constructor(
    private media: MediaService,
    private metadata: MediaMetadataService,
  ) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('folder') folder?: string,
  ) {
    return this.media.findAll(
      Math.max(1, Math.min(500, Number(page) || 1)),
      Math.max(1, Math.min(100, Number(limit) || 30)),
      type,
      folder,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('folders')
  getFolders() {
    return this.media.getFolders();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post('folders')
  createFolder(@Body() body: { name: string }) {
    return this.media.createFolder(body.name);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 30 * 1024 * 1024 },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File, @Req() req: any, @Body() body: any) {
    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin && body?.folder !== 'avatar') {
      throw new ForbiddenException('普通用户只能上传头像');
    }
    if (!isAdmin && !['image/jpeg', 'image/png', 'image/webp'].includes(file?.mimetype)) {
      throw new BadRequestException('头像仅支持 JPG、PNG 或 WebP');
    }
    if (!isAdmin && file?.size > 8 * 1024 * 1024) {
      throw new BadRequestException('头像文件不能超过 8MB');
    }
    return this.media.create(file, req.user?.id, isAdmin ? body?.folder : 'avatar', isAdmin && body?.compressAnimated === 'true');
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post('import-url')
  importUrl(@Body() body: { url?: string; folder?: string }, @Req() req: any) {
    return this.media.importFromUrl(body?.url || '', req.user?.id, body?.folder || 'cover');
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Put('batch/move')
  batchMove(@Body() body: { ids: string[]; folder: string }) {
    return this.media.batchMove(body.ids, body.folder);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post('batch/delete')
  batchRemove(@Body() body: { ids: string[] }) {
    return this.media.batchRemove(body.ids);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get(':id/metadata')
  getMetadata(@Param('id') id: string) {
    return this.metadata.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Put(':id/metadata')
  confirmMetadata(@Param('id') id: string, @Body() body: { capturedAt?: string | null; placeId?: string | null }) {
    return this.metadata.confirm(id, body);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post(':id/metadata/retry')
  retryMetadata(@Param('id') id: string) {
    return this.metadata.retry(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.media.remove(id);
  }
}

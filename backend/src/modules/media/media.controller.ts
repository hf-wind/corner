import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MediaService } from './media.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MediaMetadataService } from './media-metadata.service';
import {
  ConfirmMediaMetadataDto,
  CreateMediaFolderDto,
  ImportMediaUrlDto,
  MediaIdsDto,
  MoveMediaDto,
  UploadMediaDto,
} from './dto/media-request.dto';

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
  createFolder(@Body() dto: CreateMediaFolderDto) {
    return this.media.createFolder(dto.name);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 30 * 1024 * 1024 },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
    @Body() dto: UploadMediaDto,
  ) {
    const isAdmin = req.user?.role === 'admin';
    const folder = isAdmin ? dto?.folder : 'avatar';
    const isAvatar = folder === 'avatar';
    if (!isAdmin && !isAvatar) {
      throw new ForbiddenException('普通用户只能上传头像');
    }
    if (
      isAvatar &&
      !['image/jpeg', 'image/png', 'image/webp'].includes(file?.mimetype)
    ) {
      throw new BadRequestException('头像仅支持 JPG、PNG 或 WebP');
    }
    if (isAvatar && file?.size > 8 * 1024 * 1024) {
      throw new BadRequestException('头像文件不能超过 8MB');
    }
    return this.media.create(
      file,
      req.user?.id,
      folder,
      isAdmin && dto?.compressAnimated === 'true',
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post('import-url')
  importUrl(@Body() dto: ImportMediaUrlDto, @Req() req: any) {
    return this.media.importFromUrl(
      dto.url,
      req.user?.id,
      dto.folder || 'cover',
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Put('batch/move')
  batchMove(@Body() dto: MoveMediaDto) {
    return this.media.batchMove(dto.ids, dto.folder);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post('batch/delete')
  batchRemove(@Body() dto: MediaIdsDto) {
    return this.media.batchRemove(dto.ids);
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
  confirmMetadata(
    @Param('id') id: string,
    @Body() dto: ConfirmMediaMetadataDto,
  ) {
    return this.metadata.confirm(id, dto);
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

import { Controller, Get, Post, Put, Delete, Param, Query, UseGuards, UseInterceptors, UploadedFile, Req, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private media: MediaService) {}

  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('folder') folder?: string,
  ) {
    return this.media.findAll(page ?? 1, limit ?? 30, type, folder);
  }

  @Get('folders')
  getFolders() {
    return this.media.getFolders();
  }

  @UseGuards(AuthGuard('jwt'))
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
    return this.media.create(file, req.user?.id, body?.folder, body?.compressAnimated === 'true');
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('batch/move')
  batchMove(@Body() body: { ids: string[]; folder: string }) {
    return this.media.batchMove(body.ids, body.folder);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('batch/delete')
  batchRemove(@Body() body: { ids: string[] }) {
    return this.media.batchRemove(body.ids);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.media.remove(id);
  }
}

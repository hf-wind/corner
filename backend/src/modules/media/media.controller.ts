import { Controller, Get, Post, Delete, Param, Query, UseGuards, UseInterceptors, UploadedFile, Req, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
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
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (_req: any, file: any, cb: (err: Error | null, name: string) => void) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + extname(file.originalname));
        },
      }),
    }),
  )
  upload(@UploadedFile() file: any, @Req() req: any, @Body() body: any) {
    return this.media.create(file, req.user?.id, body?.folder);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.media.remove(id);
  }
}

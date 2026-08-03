import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Readable } from 'node:stream';
import { AuthGuard } from '@nestjs/passport';
import { MusicService } from './music.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UpdateMusicConfigDto } from './dto/update-music-config.dto';

@Controller('music')
export class MusicController {
  constructor(private music: MusicService) {}

  @Get('config')
  publicConfig() {
    return this.music.getPublicConfig();
  }

  @Get('playlist')
  playlist(
    @Query('server') server?: string,
    @Query('type') type?: string,
    @Query('id') id?: string,
    @Query('index') index?: string,
    @Query('refresh') refresh?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.music.getPlaylist({
      server,
      type,
      id,
      playlistIndex: index != null && index !== '' ? Number(index) : undefined,
      refresh: refresh === '1' || refresh === 'true',
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('proxy')
  async proxy(
    @Query('url') url: string,
    @Query('expires') expires: string,
    @Query('signature') signature: string,
    @Headers('range') range: string | undefined,
    @Res() res: Response,
  ) {
    const upstream = await this.music.proxyMedia({
      url,
      expires,
      signature,
      range,
    });
    res.status(upstream.status);
    for (const name of [
      'accept-ranges',
      'content-length',
      'content-range',
      'content-type',
      'etag',
      'last-modified',
    ]) {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    }
    res.setHeader('Cache-Control', 'public, max-age=21600, stale-while-revalidate=86400');
    if (!upstream.body) return res.end();
    Readable.fromWeb(upstream.body as any).pipe(res);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('admin/config')
  async adminConfig() {
    const config = await this.music.getConfig();
    return {
      config,
      defaults: this.music.getDefaults(),
    };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Put('admin/config')
  async updateConfig(@Body() dto: UpdateMusicConfigDto) {
    const config = await this.music.updateConfig(dto.config || {});
    return {
      config,
      defaults: this.music.getDefaults(),
    };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post('admin/refresh')
  refresh() {
    return this.music.refreshCache();
  }
}

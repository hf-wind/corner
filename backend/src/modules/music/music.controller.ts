import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Post,
  Param,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import type { Request } from 'express';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { AuthGuard } from '@nestjs/passport';
import { MusicService } from './music.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UpdateMusicConfigDto } from './dto/update-music-config.dto';
import { MusicFavoriteDto } from './dto/music-favorite.dto';
import { ResolveMusicCoverDto } from './dto/resolve-music-cover.dto';

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
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const controller = new AbortController();
    const abortUpstream = () => controller.abort();
    req.once('aborted', abortUpstream);
    res.once('close', abortUpstream);
    const upstream = await this.music.proxyMedia({
      url,
      expires,
      signature,
      range,
      signal: controller.signal,
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
    res.setHeader(
      'Cache-Control',
      'public, max-age=21600, stale-while-revalidate=86400',
    );
    if (!upstream.body) {
      req.off('aborted', abortUpstream);
      res.off('close', abortUpstream);
      controller.abort();
      return res.end();
    }
    try {
      await pipeline(Readable.fromWeb(upstream.body as any), res);
    } catch {
      if (!res.writableEnded && !res.destroyed) res.end();
    } finally {
      req.off('aborted', abortUpstream);
      res.off('close', abortUpstream);
      controller.abort();
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('favorites')
  favorites(@Req() req: any) {
    return this.music.listFavorites(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('favorites')
  addFavorite(@Req() req: any, @Body() dto: MusicFavoriteDto) {
    return this.music.addFavorite(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('favorites/:key')
  removeFavorite(@Req() req: any, @Param('key') key: string) {
    return this.music.removeFavorite(req.user.id, key);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('admin/source-tracks')
  sourceTracks(
    @Query('server') server?: string,
    @Query('type') type?: string,
    @Query('id') id?: string,
  ) {
    return this.music.getAdminSourceTracks(
      server || 'netease',
      type || 'playlist',
      id || '',
    );
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

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post('admin/cover')
  async resolveCover(@Body() body: ResolveMusicCoverDto) {
    return {
      pic: await this.music.resolveTrackCover(
        String(body?.name || ''),
        String(body?.artist || ''),
      ),
    };
  }
}

import { Body, Controller, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MusicService } from './music.service';

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
  ) {
    return this.music.getPlaylist({
      server,
      type,
      id,
      playlistIndex: index != null && index !== '' ? Number(index) : undefined,
      refresh: refresh === '1' || refresh === 'true',
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('admin/config')
  async adminConfig() {
    const config = await this.music.getConfig();
    return {
      config,
      defaults: this.music.getDefaults(),
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('admin/config')
  async updateConfig(@Body() body: { config?: Record<string, unknown> }) {
    const config = await this.music.updateConfig(body?.config || {});
    return {
      config,
      defaults: this.music.getDefaults(),
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('admin/refresh')
  refresh() {
    return this.music.refreshCache();
  }
}

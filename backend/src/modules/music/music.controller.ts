import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
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

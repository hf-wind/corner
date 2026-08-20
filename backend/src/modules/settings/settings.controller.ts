import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('settings')
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findAll() {
    return this.settings.findAll();
  }

  @Get('health')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  health() {
    return this.settings.health();
  }

  @Get(':key')
  async get(@Param('key') key: string) {
    const publicKeys = new Set([
      'friends',
      'my_site_info',
      'site_title',
      'site_description',
      'site_keywords',
      'site_url',
      'about_profile',
      'constellation_music_url',
    ]);
    if (!publicKeys.has(key)) return null;
    const value = await this.settings.get(key);
    if (key !== 'friends' || !Array.isArray(value)) return value;
    return value.map((friend: any) => ({
      name: friend.name || friend.siteName,
      url: friend.url || friend.siteUrl,
      avatar: friend.avatar || friend.siteAvatar,
      description: friend.description || friend.siteDescription || friend.desc,
      rssUrl: friend.rssUrl || friend.siteRssUrl,
      webmasterName: friend.webmasterName,
      approvedAt: friend.approvedAt,
    }));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put()
  set(@Body() dto: UpdateSettingDto) {
    return this.settings.set(dto.key, dto.value);
  }
}

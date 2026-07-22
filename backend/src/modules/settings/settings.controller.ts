import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Controller('settings')
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get()
  findAll() {
    return this.settings.findAll();
  }

  @Get(':key')
  get(@Param('key') key: string) {
    return this.settings.get(key);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put()
  set(@Body() dto: UpdateSettingDto) {
    return this.settings.set(dto.key, dto.value);
  }
}

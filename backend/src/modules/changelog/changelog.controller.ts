import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ChangelogService } from './changelog.service';
import {
  UpdateChangelogConfigDto,
  UpsertChangelogEntryDto,
} from './dto/changelog.dto';

@Controller('changelog')
export class ChangelogController {
  constructor(private readonly changelog: ChangelogService) {}

  @Get('status')
  status() {
    return this.changelog.status();
  }

  @Get()
  list(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.changelog.list({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  admin() {
    return this.changelog.admin();
  }

  @Put('admin/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateConfig(@Body() dto: UpdateChangelogConfigDto) {
    return this.changelog.updateConfig(dto);
  }

  @Post('admin/entries')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createEntry(@Body() dto: UpsertChangelogEntryDto) {
    return this.changelog.createEntry(dto);
  }

  @Put('admin/entries/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateEntry(@Param('id') id: string, @Body() dto: UpsertChangelogEntryDto) {
    return this.changelog.updateEntry(id, dto);
  }

  @Delete('admin/entries/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  removeEntry(@Param('id') id: string) {
    return this.changelog.removeEntry(id);
  }

  @Post('admin/refresh')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  refresh() {
    return this.changelog.refresh();
  }
}

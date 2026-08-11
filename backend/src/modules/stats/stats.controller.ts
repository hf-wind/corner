import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('stats')
export class StatsController {
  constructor(private stats: StatsService) {}

  @Get('overview')
  overview() {
    return this.stats.overview();
  }

  @Get('activities')
  activities(@Query('limit') limit?: string) {
    return this.stats.activities(limit ? Number(limit) : 5);
  }

  @Get('radar')
  radar() {
    return this.stats.radar();
  }

  @Get('system')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  system() {
    return this.stats.system();
  }
}

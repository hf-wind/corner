import { Controller, Get } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private stats: StatsService) {}

  @Get('overview')
  overview() {
    return this.stats.overview();
  }

  @Get('radar')
  radar() {
    return this.stats.radar();
  }

  @Get('system')
  system() {
    return this.stats.system();
  }
}

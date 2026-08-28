import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CircleService } from './circle.service';
import { UpdateCircleConfigDto } from './dto/update-circle-config.dto';

@Controller('circle')
export class CircleController {
  constructor(private readonly circle: CircleService) {}

  @Get('feed')
  feed(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('refresh') refresh?: string,
  ) {
    return this.circle.getFeed({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      refresh: refresh === '1' || refresh === 'true',
    });
  }

  @Get('admin/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  config() {
    return this.circle.getConfig();
  }

  @Put('admin/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  update(@Body() body: UpdateCircleConfigDto) {
    return this.circle.updateConfig(body || {});
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { LogsService } from './logs.service';

@Controller('logs')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
export class LogsController {
  constructor(private readonly logs: LogsService) {}

  @Get()
  list(@Query('lines') lines?: string, @Query('level') level?: string, @Query('search') search?: string) {
    return this.logs.list({ lines: lines ? Number(lines) : undefined, level, search });
  }

  @Get('status')
  status() { return this.logs.status(); }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BackupService } from './backup.service';
import { RestoreBackupDto } from './dto/restore-backup.dto';

@Controller('backups')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
export class BackupController {
  constructor(private readonly backups: BackupService) {}

  @Get()
  list() {
    return this.backups.list();
  }

  @Get('inventory')
  inventory() {
    return this.backups.inventory();
  }

  @Get('status')
  status() {
    return this.backups.status();
  }

  @Post()
  create(@Req() request: any) {
    return this.backups.requestBackup(request.user.id);
  }

  @Post(':backupId/restore')
  restore(
    @Param('backupId') backupId: string,
    @Req() request: any,
    @Body() dto: RestoreBackupDto,
  ) {
    return this.backups.requestRestore(
      backupId,
      request.user.id,
      dto.recoveryToken,
      dto.confirmation,
    );
  }
}

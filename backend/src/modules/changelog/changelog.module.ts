import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { SettingsModule } from '../settings/settings.module';
import { ChangelogController } from './changelog.controller';
import { ChangelogService } from './changelog.service';

@Module({
  imports: [SettingsModule, AiModule],
  controllers: [ChangelogController],
  providers: [ChangelogService],
})
export class ChangelogModule {}

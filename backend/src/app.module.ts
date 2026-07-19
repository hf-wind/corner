import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { PostModule } from './modules/post/post.module';
import { CategoryModule } from './modules/category/category.module';
import { TagModule } from './modules/tag/tag.module';
import { CommentModule } from './modules/comment/comment.module';
import { MediaModule } from './modules/media/media.module';
import { StatsModule } from './modules/stats/stats.module';
import { WeatherModule } from './modules/weather/weather.module';
import { AiPetModule } from './modules/ai-pet/ai-pet.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [PrismaModule, AuthModule, UserModule, PostModule, CategoryModule, TagModule, CommentModule, MediaModule, StatsModule, WeatherModule, AiPetModule, SettingsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
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
import { AiModule } from './modules/ai/ai.module';
import { SettingsModule } from './modules/settings/settings.module';
import { MusicModule } from './modules/music/music.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false,
        maxAge: '1y',
        immutable: true,
      },
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    PostModule,
    CategoryModule,
    TagModule,
    CommentModule,
    MediaModule,
    StatsModule,
    WeatherModule,
    AiPetModule,
    AiModule,
    SettingsModule,
    MusicModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

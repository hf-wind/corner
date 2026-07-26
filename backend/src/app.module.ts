import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { BullModule } from '@nestjs/bull';
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
import { EmojiModule } from './modules/emoji/emoji.module';
import { EmailModule } from './modules/email/email.module';
import { NotificationModule } from './modules/notification/notification.module';
import { FriendLinkModule } from './modules/friend-link/friend-link.module';
import { LibraryModule } from './modules/library/library.module';

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
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASS,
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
    EmojiModule,
    EmailModule,
    NotificationModule,
    FriendLinkModule,
    LibraryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

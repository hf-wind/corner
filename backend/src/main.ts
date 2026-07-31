import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { HttpCacheInterceptor } from './common/interceptors/http-cache.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.setGlobalPrefix('api', { exclude: [{ path: 'rss.xml', method: RequestMethod.GET }] });
  app.enableCors({
    origin: process.env.NODE_ENV === 'production'
      ? ['https://corner.ink', 'https://www.corner.ink']
      : ['http://localhost:3000'],
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  app.useGlobalInterceptors(app.get(HttpCacheInterceptor), new ResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}/api`);
}
bootstrap().catch((err) => {
  console.error('Failed to start backend:', err);
  process.exit(1);
});

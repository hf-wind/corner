import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { HttpCacheInterceptor } from './common/interceptors/http-cache.interceptor';
import { createRequestValidationPipe } from './common/validation/request-validation.pipe';
import { FileLogger } from './common/logging/file-logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: new FileLogger() });
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.setGlobalPrefix('api', {
    exclude: [{ path: 'rss.xml', method: RequestMethod.GET }],
  });
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? ['https://corner.ink', 'https://www.corner.ink']
        : ['http://localhost:3000'],
    credentials: true,
  });
  app.useGlobalPipes(createRequestValidationPipe());
  app.useGlobalInterceptors(
    app.get(HttpCacheInterceptor),
    new ResponseInterceptor(),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}/api`);
}
bootstrap().catch((err) => {
  console.error('Failed to start backend:', err);
  process.exit(1);
});

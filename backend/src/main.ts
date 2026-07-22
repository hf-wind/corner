import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}/api`);
}
bootstrap().catch((err) => {
  console.error('Failed to start backend:', err);
  process.exit(1);
});

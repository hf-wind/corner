import { ValidationPipe } from '@nestjs/common';

export function createRequestValidationPipe() {
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false,
  });
}

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    if (response.headersSent || response.writableEnded) return;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message =
        typeof res === 'string'
          ? res
          : ((res as any).message ?? exception.message);
      if (Array.isArray(message)) message = message[0];
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (response.headersSent || response.writableEnded) return;
    response.status(status).json({
      code: status,
      data: null,
      message,
    });
  }
}

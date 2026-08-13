import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    if (request.url?.includes('/stream') || request.url?.endsWith('/rss.xml')) {
      return next.handle() as Observable<ApiResponse<T>>;
    }

    return next.handle().pipe(
      map((data) => ({
        code: 200,
        data: data ?? null,
        message: 'success',
      })),
    );
  }
}

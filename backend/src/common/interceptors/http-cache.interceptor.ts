import { createHash } from 'crypto';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, of } from 'rxjs';
import { catchError, finalize, mergeMap, tap } from 'rxjs/operators';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpCacheInterceptor.name);

  constructor(private readonly redis: RedisService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const method = request.method.toUpperCase();

    if (method !== 'GET') {
      return next.handle().pipe(
        tap(() => {
          if (!this.shouldInvalidate(request.path)) return;
          void this.redis.invalidateHttpCache().catch((error: Error) => {
            this.logger.warn(`Cache invalidation failed: ${error.message}`);
          });
        }),
      );
    }

    if (!this.isCacheable(request)) {
      response.setHeader('X-Cache', 'BYPASS');
      return next.handle();
    }

    return new Observable((subscriber) => {
      void (async () => {
        try {
          const version = await this.redis.cacheVersion();
          const digest = createHash('sha256')
            .update(request.originalUrl)
            .digest('hex');
          const key = `corner:http-cache:${version}:${digest}`;
          const cached = await this.redis.getJson<unknown>(key);
          if (cached !== null) {
            this.applyEtag(response, cached);
            response.setHeader('X-Cache', 'HIT');
            subscriber.next(cached);
            subscriber.complete();
            return;
          }

          const lockKey = `${key}:lock`;
          const ownsLock =
            (await this.redis.client.set(lockKey, '1', 'EX', 5, 'NX')) === 'OK';
          if (!ownsLock) {
            await new Promise((resolve) => setTimeout(resolve, 75));
            const filled = await this.redis.getJson<unknown>(key);
            if (filled !== null) {
              this.applyEtag(response, filled);
              response.setHeader('X-Cache', 'HIT');
              subscriber.next(filled);
              subscriber.complete();
              return;
            }
          }

          response.setHeader('X-Cache', 'MISS');
          next
            .handle()
            .pipe(
              mergeMap((data) => {
                this.applyEtag(response, data);
                void this.redis
                  .setJson(key, data, this.ttlFor(request.path))
                  .catch((error: Error) => {
                    this.logger.warn(`Cache write failed: ${error.message}`);
                  });
                return of(data);
              }),
              catchError((error) => {
                throw error;
              }),
              finalize(() => {
                if (ownsLock) void this.redis.client.del(lockKey);
              }),
            )
            .subscribe(subscriber);
        } catch (error) {
          this.logger.warn(
            `Cache read failed, bypassing: ${(error as Error).message}`,
          );
          response.setHeader('X-Cache', 'BYPASS');
          next.handle().subscribe(subscriber);
        }
      })();
    });
  }

  private isCacheable(request: Request): boolean {
    if (request.headers.authorization || request.headers.cookie) return false;
    const path = request.path;
    if (path === '/rss.xml') return false;
    if (/\/(?:health|auth|notifications)(?:\/|$)/.test(path)) return false;
    // Weather has provider-specific stale caching and must still work while Redis reconnects.
    if (/\/weather(?:\/|$)/.test(path)) return false;
    if (/\/(?:admin)(?:\/|$)/.test(path)) return false;
    if (/\/(?:users|media|email)(?:\/|$)/.test(path)) return false;
    if (path.endsWith('/stream')) return false;
    if (request.query.refresh === '1' || request.query.refresh === 'true')
      return false;

    // These detail handlers update view counters or include user-specific state.
    if (/\/posts\/[^/]+$/.test(path)) return false;
    if (/\/moments\/[^/]+$/.test(path)) return false;
    if (/\/library\/[^/]+$/.test(path)) return false;
    return true;
  }

  private shouldInvalidate(path: string): boolean {
    return !/\/auth\/(?:login|send-code)$/.test(path);
  }

  private ttlFor(path: string): number {
    if (/\/memories\/(?:map|places)(?:\/|$)/.test(path)) return 120;
    if (/\/(?:settings|categories|tags|emoji-packs)(?:\/|$)/.test(path))
      return 600;
    if (
      /\/(?:posts|moments|library|comments|moment-comments)(?:\/|$)/.test(path)
    )
      return 120;
    return 60;
  }

  private applyEtag(response: Response, data: unknown) {
    const etag = `\"${createHash('sha256').update(JSON.stringify(data)).digest('base64url')}\"`;
    response.setHeader('ETag', etag);
  }
}

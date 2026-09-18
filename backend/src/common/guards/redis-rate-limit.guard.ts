import { createHash } from 'crypto';
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { RedisService } from '../redis/redis.service';

type LimitRule = {
  name: string;
  limit: number;
  windowSeconds: number;
  identity?: 'email';
};

const RATE_LIMIT_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('TTL', KEYS[1])
return { current, ttl }
`;

@Injectable()
export class RedisRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RedisRateLimitGuard.name);

  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    if (request.path.endsWith('/health') || request.path.endsWith('/weather'))
      return true;

    const rules = this.rulesFor(request);
    try {
      for (const rule of rules) {
        await this.consume(request, response, rule);
      }
    } catch (error) {
      if (
        error instanceof HttpException &&
        error.getStatus() === HttpStatus.TOO_MANY_REQUESTS
      )
        throw error;
      this.logger.error(
        `Rate limiter unavailable: ${(error as Error).message}`,
      );
    }
    return true;
  }

  private async consume(request: Request, response: Response, rule: LimitRule) {
    if (this.redis.isReady === false) return;
    const identity =
      rule.identity === 'email'
        ? createHash('sha256')
            .update(
              String(request.body?.email || '')
                .trim()
                .toLowerCase(),
            )
            .digest('hex')
        : this.clientIp(request);
    const key = `corner:rate:${rule.name}:${identity}`;
    const result = (await this.redis.client.eval(
      RATE_LIMIT_SCRIPT,
      1,
      key,
      String(rule.windowSeconds),
    )) as [number, number];
    const current = Number(result[0]);
    const ttl = Math.max(1, Number(result[1]));

    response.setHeader('RateLimit-Limit', String(rule.limit));
    response.setHeader(
      'RateLimit-Remaining',
      String(Math.max(0, rule.limit - current)),
    );
    response.setHeader('RateLimit-Reset', String(ttl));
    if (current <= rule.limit) return;

    response.setHeader('Retry-After', String(ttl));
    throw new HttpException(
      `请求过于频繁，请在 ${ttl} 秒后重试`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private rulesFor(request: Request): LimitRule[] {
    const method = request.method.toUpperCase();
    const path = request.path;
    const rules: LimitRule[] = [
      { name: 'global', limit: 240, windowSeconds: 60 },
    ];

    if (method === 'POST' && path.endsWith('/auth/login')) {
      rules.push({ name: 'login-ip', limit: 10, windowSeconds: 600 });
      rules.push({
        name: 'login-email',
        limit: 8,
        windowSeconds: 600,
        identity: 'email',
      });
    } else if (method === 'POST' && path.endsWith('/auth/register')) {
      rules.push({ name: 'register-ip', limit: 5, windowSeconds: 3600 });
      rules.push({
        name: 'register-email',
        limit: 3,
        windowSeconds: 3600,
        identity: 'email',
      });
    } else if (method === 'POST' && path.endsWith('/auth/send-code')) {
      rules.push({ name: 'send-code-ip', limit: 8, windowSeconds: 3600 });
      rules.push({
        name: 'send-code-email',
        limit: 5,
        windowSeconds: 3600,
        identity: 'email',
      });
    } else if (
      method === 'POST' &&
      /\/friend-link\/(?:apply|inspect-site)/.test(path)
    ) {
      rules.push({ name: 'friend-link', limit: 6, windowSeconds: 3600 });
    } else if (
      method === 'POST' &&
      path.endsWith('/friend-link/remove/send-code')
    ) {
      rules.push({
        name: 'friend-remove-code-ip',
        limit: 8,
        windowSeconds: 3600,
      });
      rules.push({
        name: 'friend-remove-code-email',
        limit: 5,
        windowSeconds: 3600,
        identity: 'email',
      });
    } else if (
      method === 'POST' &&
      path.endsWith('/friend-link/remove/verify')
    ) {
      rules.push({
        name: 'friend-remove-verify-ip',
        limit: 10,
        windowSeconds: 600,
      });
      rules.push({
        name: 'friend-remove-verify-email',
        limit: 8,
        windowSeconds: 600,
        identity: 'email',
      });
    } else if (method === 'POST' && path.endsWith('/visitor/identify')) {
      rules.push({ name: 'visitor-identify', limit: 12, windowSeconds: 60 });
    } else if (method === 'POST' && path.endsWith('/visitor/messages')) {
      rules.push({ name: 'visitor-message', limit: 10, windowSeconds: 600 });
    } else if (method === 'POST' && path.endsWith('/visitor/bottle/throw')) {
      rules.push({ name: 'visitor-bottle-throw', limit: 6, windowSeconds: 3600 });
    } else if (method === 'POST' && path.endsWith('/visitor/bottle/fish')) {
      rules.push({ name: 'visitor-bottle-fish', limit: 12, windowSeconds: 3600 });
    } else if (method === 'POST' && path.endsWith('/visitor/events')) {
      rules.push({ name: 'visitor-events', limit: 30, windowSeconds: 60 });
    } else if (
      method === 'POST' &&
      /\/(?:comments|moment-comments)(?:\/[^/]+\/like)?$/.test(path)
    ) {
      rules.push({ name: 'comment-write', limit: 20, windowSeconds: 600 });
    } else if (method === 'POST' && /\/ai\/(?:chat|chat\/stream)$/.test(path)) {
      rules.push({ name: 'ai-chat', limit: 20, windowSeconds: 600 });
    } else if (
      method === 'POST' &&
      /\/media\/(?:upload|import-url)$/.test(path)
    ) {
      rules.push({ name: 'media-upload', limit: 30, windowSeconds: 3600 });
    } else if (
      method === 'GET' &&
      path.endsWith('/posts') &&
      request.query.search
    ) {
      rules.push({ name: 'search', limit: 40, windowSeconds: 60 });
    }
    return rules;
  }

  private clientIp(request: Request): string {
    return request.ip || request.socket.remoteAddress || 'unknown';
  }
}

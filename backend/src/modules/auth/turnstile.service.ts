import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

type TurnstileResponse = {
  success?: boolean;
  hostname?: string;
  'error-codes'?: string[];
};

@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  async verify(token: string | undefined, remoteIp?: string): Promise<void> {
    if (process.env.NODE_ENV !== 'production') return;

    const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
    if (!secret) {
      this.logger.error('TURNSTILE_SECRET_KEY is missing in production');
      throw new ServiceUnavailableException('人机验证服务尚未配置');
    }
    if (!token?.trim()) throw new BadRequestException('请完成人机验证');

    const body = new URLSearchParams({ secret, response: token.trim() });
    if (remoteIp) body.set('remoteip', remoteIp);

    let result: TurnstileResponse;
    try {
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(6000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      result = await response.json() as TurnstileResponse;
    } catch (error) {
      this.logger.warn(`Turnstile verification request failed: ${(error as Error).message}`);
      throw new ServiceUnavailableException('人机验证服务暂时不可用，请稍后重试');
    }

    const expectedHostname = (process.env.TURNSTILE_HOSTNAME || 'corner.ink').trim().toLowerCase();
    if (!result.success || (expectedHostname && result.hostname?.toLowerCase() !== expectedHostname)) {
      this.logger.warn(`Turnstile rejected request: ${(result['error-codes'] || []).join(',') || 'hostname mismatch'}`);
      throw new BadRequestException('人机验证失败，请刷新后重试');
    }
  }
}

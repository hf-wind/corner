// backend/src/modules/auth/geetest.service.ts

import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as crypto from 'crypto';

type GeetestResponse = {
  status?: string
  result?: string
  reason?: string
  captcha_args?: Record<string, unknown>
}

@Injectable()
export class GeetestService {
  private readonly logger = new Logger(GeetestService.name)

  // 前端将极验 v4 成功回调的四字段打包为 JSON 字符串传入，此处解析后做二次校验
  async verify(combinedToken: string, _remoteIp?: string): Promise<void> {
    if (!this.isEnabled()) return

    const captchaId = process.env.GEETEST_CAPTCHA_ID?.trim()
    const captchaKey = process.env.GEETEST_CAPTCHA_KEY?.trim()
    const apiServer = process.env.GEETEST_API_SERVER?.trim() || 'https://gcaptcha4.geetest.com'

    if (!captchaId || !captchaKey) {
      this.logger.error('GEETEST_CAPTCHA_ID or GEETEST_CAPTCHA_KEY is missing')
      throw new ServiceUnavailableException('验证服务尚未配置')
    }

    let lotNumber: string
    let captchaOutput: string
    let passToken: string
    let genTime: string
    try {
      const parsed = JSON.parse(combinedToken) as Partial<{
        lot_number: string
        captchaOutput: string
        lotNumber: string
        captcha_output: string
        pass_token: string
        passToken: string
        gen_time: string
        genTime: string
      }>
      lotNumber = String(parsed.lot_number ?? parsed.lotNumber ?? '')
      captchaOutput = String(parsed.captcha_output ?? parsed.captchaOutput ?? '')
      passToken = String(parsed.pass_token ?? parsed.passToken ?? '')
      genTime = String(parsed.gen_time ?? parsed.genTime ?? '')
    } catch {
      lotNumber = ''
      captchaOutput = ''
      passToken = ''
      genTime = ''
    }

    if (!lotNumber || !captchaOutput || !passToken || !genTime) {
      throw new BadRequestException('请完成人机验证')
    }

    // 生成签名
    const signToken = crypto
      .createHmac('sha256', captchaKey)
      .update(lotNumber)
      .digest('hex')

    const body = new URLSearchParams({
      lot_number: lotNumber,
      captcha_output: captchaOutput,
      pass_token: passToken,
      gen_time: genTime,
      sign_token: signToken,
    })

    let response: Response
    try {
      response = await fetch(`${apiServer}/validate?captcha_id=${captchaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(6000),
      })
    } catch (error) {
      this.logger.warn(
        `Geetest verification request failed: ${(error as Error).message}`,
      )
      throw new ServiceUnavailableException(
        '验证服务暂时不可用，请稍后重试',
      )
    }

    if (!response.ok) {
      this.logger.warn(`Geetest API returned HTTP ${response.status}`)
      throw new ServiceUnavailableException(
        '验证服务暂时不可用，请稍后重试',
      )
    }

    let result: GeetestResponse
    try {
      result = (await response.json()) as GeetestResponse
    } catch {
      this.logger.warn('Failed to parse Geetest response')
      throw new ServiceUnavailableException(
        '验证服务响应异常，请稍后重试',
      )
    }

    if (result.result !== 'success') {
      this.logger.warn(
        `Geetest rejected request: ${result.reason || 'unknown'}`,
      )
      throw new BadRequestException('人机验证失败，请重新完成验证')
    }
  }

  isEnabled(): boolean {
    const configured = process.env.GEETEST_ENABLED?.trim().toLowerCase()
    if (configured) return !['0', 'false', 'off', 'no'].includes(configured)
    return Boolean(
      process.env.NODE_ENV === 'production' &&
      process.env.GEETEST_CAPTCHA_ID?.trim() &&
      process.env.GEETEST_CAPTCHA_KEY?.trim(),
    )
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';

export type BaiduTranslationResult = {
  text: string;
  duration: number;
};

@Injectable()
export class BaiduTranslationService {
  private readonly logger = new Logger(BaiduTranslationService.name);
  private readonly appId: string;
  private readonly secretKey: string;
  private readonly endpoint = 'https://fanyi-api.baidu.com/api/trans/vip/translate';

  constructor() {
    this.appId = process.env.BAIDU_TRANSLATE_APP_ID || '';
    this.secretKey = process.env.BAIDU_TRANSLATE_SECRET_KEY || '';
  }

  get configured(): boolean {
    return !!(this.appId && this.secretKey);
  }

  private generateSign(query: string, salt: string): string {
    const str = this.appId + query + salt + this.secretKey;
    return createHash('md5').update(str, 'utf8').digest('hex');
  }

  private generateSalt(): string {
    return String(Math.random()).slice(2, 10);
  }

  async translate(text: string, from = 'en', to = 'zh'): Promise<BaiduTranslationResult> {
    if (!this.configured) {
      throw new Error('百度翻译 API 未配置');
    }
    if (!text.trim()) {
      return { text: '', duration: 0 };
    }

    const start = Date.now();
    const salt = this.generateSalt();
    const sign = this.generateSign(text, salt);

    const params = new URLSearchParams({
      q: text,
      from,
      to,
      appid: this.appId,
      salt,
      sign,
    });

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`百度翻译 HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    const duration = Date.now() - start;

    if (result.error_code) {
      throw new Error(`百度翻译失败: ${result.error_code} - ${result.error_msg}`);
    }

    const translatedText = result.trans_result?.map((item: any) => item.dst).join('\n');
    if (!translatedText) {
      throw new Error('百度翻译返回空结果');
    }

    return {
      text: translatedText,
      duration,
    };
  }

  async translateBatch(texts: string[], from = 'en', to = 'zh'): Promise<BaiduTranslationResult[]> {
    if (!this.configured) {
      throw new Error('百度翻译 API 未配置');
    }

    const results: BaiduTranslationResult[] = [];
    // 百度 VIP 接口的 q 字段有长度限制，逐条请求可以保证长提交说明不被截断。
    for (const text of texts) {
      results.push(await this.translate(text, from, to));
    }
    return results;
  }

}

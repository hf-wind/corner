import { Injectable } from '@nestjs/common';
import { access, readFile, readdir } from 'fs/promises';
import { basename, join } from 'path';

@Injectable()
export class LogsService {
  private readonly logFile = process.env.APP_LOG_FILE ||
    (process.env.NODE_ENV === 'production' ? '/app/logs/backend.log' : join(process.cwd(), 'logs/backend.log'));

  async list(query: { lines?: number; level?: string; search?: string } = {}) {
    const linesLimit = Math.min(Math.max(Number(query.lines) || 300, 1), 2000);
    const files = [...Array.from({ length: 5 }, (_, index) => `${this.logFile}.${5 - index}`), this.logFile];
    const chunks: string[] = [];
    for (const file of files) {
      try { chunks.push(await readFile(file, 'utf8')); } catch { /* file may not exist */ }
    }
    const level = query.level?.trim().toUpperCase();
    const search = query.search?.trim().toLowerCase();
    const entries = chunks.join('').split(/\r?\n/).filter(Boolean).filter((line) =>
      (!level || line.includes(`] ${level} `) || line.includes(`] ${level} [`)) &&
      (!search || line.toLowerCase().includes(search)),
    );
    return {
      items: entries.slice(-linesLimit).reverse(),
      total: entries.length,
      checkedAt: new Date().toISOString(),
      source: basename(this.logFile),
    };
  }

  async status() {
    try {
      await access(this.logFile);
      return { available: true, source: basename(this.logFile) };
    } catch {
      return { available: false, source: basename(this.logFile) };
    }
  }
}

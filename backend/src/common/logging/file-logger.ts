import { LoggerService } from '@nestjs/common';
import { appendFile, mkdir, rename, stat } from 'fs/promises';
import { dirname, join } from 'path';

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 5;

export class FileLogger implements LoggerService {
  private readonly file = process.env.APP_LOG_FILE ||
    (process.env.NODE_ENV === 'production' ? '/app/logs/backend.log' : join(process.cwd(), 'logs/backend.log'));
  private pending = Promise.resolve();

  log(message: any, context?: string) { this.write('LOG', message, context); }
  warn(message: any, context?: string) { this.write('WARN', message, context); }
  error(message: any, stack?: string, context?: string) {
    this.write('ERROR', stack ? `${message}\n${stack}` : message, context);
  }
  debug(message: any, context?: string) { this.write('DEBUG', message, context); }
  verbose(message: any, context?: string) { this.write('VERBOSE', message, context); }
  fatal(message: any, context?: string) { this.write('FATAL', message, context); }

  private write(level: string, message: any, context?: string) {
    const text = typeof message === 'string' ? message : JSON.stringify(message);
    const lines = String(text ?? '').split(/\r?\n/);
    const prefix = `[${new Date().toISOString()}] ${level}${context ? ` [${context}]` : ''}`;
    const output = lines.map((line) => `${prefix} ${line}`).join('\n') + '\n';
    if (level === 'ERROR' || level === 'FATAL') console.error(output.trimEnd());
    else if (level === 'WARN') console.warn(output.trimEnd());
    else console.log(output.trimEnd());
    this.pending = this.pending.then(() => this.persist(output)).catch(() => undefined);
  }

  private async persist(output: string) {
    await mkdir(dirname(this.file), { recursive: true, mode: 0o750 });
    try {
      const current = await stat(this.file);
      if (current.size + Buffer.byteLength(output) > MAX_BYTES) {
        for (let index = MAX_FILES - 1; index >= 1; index -= 1) {
          const source = `${this.file}.${index}`;
          const target = `${this.file}.${index + 1}`;
          try { await rename(source, target); } catch { /* missing rotation slot */ }
        }
        try { await rename(this.file, `${this.file}.1`); } catch { /* concurrent cleanup */ }
      }
    } catch { /* file does not exist yet */ }
    await appendFile(this.file, output, { encoding: 'utf8', mode: 0o640 });
  }
}
